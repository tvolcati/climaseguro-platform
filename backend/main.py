import os
import json
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.storage import init_storage, save_upload_files, open_document_stream
from backend.models import Base, PreventionProcess, ProcessPhoto, ProcessForm, GeneratedDocument
from backend.database import engine, SessionLocal
from backend.services.gemini import describe_images_with_gemini
from backend.services.doc_gen import generate_documents_for_fund, FundDefinition, list_funds
from backend.services.context_builder import build_context


app = FastAPI(title="ClimaSeguro Backend", version="0.1.0")

# CORS para o front local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    # Reset DB em desenvolvimento, se habilitado
    if os.getenv("RESET_DB_ON_STARTUP", "false").lower() in {"1", "true", "yes"}:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    init_storage()


def _load_context(process: PreventionProcess) -> dict:
    try:
        return json.loads(process.context_json or "{}")
    except Exception:
        return {}


def _save_context(db, process: PreventionProcess, ctx: dict) -> None:
    process.context_json = json.dumps(ctx, ensure_ascii=False)
    db.add(process)


@app.post("/processos/prevencao")
def create_prevention_process(zone_id: Optional[int] = Form(None), context: Optional[str] = Form(None)):
    db = SessionLocal()
    try:
        initial_ctx = {}
        if context:
            try:
                initial_ctx = json.loads(context)
            except Exception:
                initial_ctx = {"_warning": "invalid_context_payload"}

        process = PreventionProcess(zone_id=zone_id, status="draft", context_json=json.dumps(initial_ctx))
        db.add(process)
        db.commit()
        db.refresh(process)
        return {"processId": process.id}
    finally:
        db.close()


@app.post("/processos/prevencao/{process_id}/fotos")
async def upload_photos(process_id: int, files: List[UploadFile] = File(...)):
    db = SessionLocal()
    try:
        process = db.query(PreventionProcess).get(process_id)
        if not process:
            raise HTTPException(status_code=404, detail="Processo não encontrado")

        # Salva arquivos e chama Gemini para descrever
        saved_paths = save_upload_files(process_id, files)
        descriptions = await describe_images_with_gemini([p.path for p in saved_paths])

        photos_out = []
        for saved, desc in zip(saved_paths, descriptions):
            photo = ProcessPhoto(process_id=process_id, file_path=saved.path, description_ai=desc)
            db.add(photo)
            db.flush()
            photos_out.append({
                "id": photo.id,
                "filePath": photo.file_path,
                "description": photo.description_ai,
            })

        # Atualiza contexto do processo
        ctx = _load_context(process)
        photos_ctx = ctx.get("photos", [])
        for saved, desc in zip(saved_paths, descriptions):
            photos_ctx.append({"path": saved.path, "description": desc})
        ctx["photos"] = photos_ctx

        process.status = "photos_captured"
        _save_context(db, process, ctx)
        db.commit()
        return {"photos": photos_out}
    finally:
        db.close()


@app.post("/processos/prevencao/{process_id}/formulario")
def submit_form(process_id: int, responsavel: str = Form(...), data_vistoria: str = Form(...), observacoes: str = Form(""), acao_imediata: str = Form("")):
    db = SessionLocal()
    try:
        process = db.query(PreventionProcess).get(process_id)
        if not process:
            raise HTTPException(status_code=404, detail="Processo não encontrado")

        form = ProcessForm(
            process_id=process_id,
            inspector_name=responsavel,
            inspection_date=data_vistoria,
            technical_notes=observacoes,
            immediate_action=acao_imediata,
        )
        db.add(form)
        # Atualiza contexto
        ctx = _load_context(process)
        ctx["form"] = {
            "responsavel": responsavel,
            "data_vistoria": data_vistoria,
            "observacoes": observacoes,
            "acao_imediata": acao_imediata,
        }
        process.status = "form_filled"
        _save_context(db, process, ctx)
        db.commit()
        db.refresh(form)
        return {"formId": form.id}
    finally:
        db.close()


@app.get("/fundos")
def get_funds():
    return {"funds": [f.dict() for f in list_funds()]}


@app.post("/processos/prevencao/{process_id}/gerar-documentos")
def generate_documents(process_id: int, fundo: str = Form(...)):
    db = SessionLocal()
    try:
        process = db.query(PreventionProcess).get(process_id)
        if not process:
            raise HTTPException(status_code=404, detail="Processo não encontrado")

        # Coletar insumos
        photos = db.query(ProcessPhoto).filter_by(process_id=process_id).all()
        form = db.query(ProcessForm).filter_by(process_id=process_id).order_by(ProcessForm.id.desc()).first()

        if not form:
            raise HTTPException(status_code=400, detail="Formulário não encontrado para o processo")

        context_consolidado = build_context(process_id)

        docs_payload = generate_documents_for_fund(
            fund_code=fundo,
            process_id=process_id,
            zone_id=process.zone_id,
            form_data={
                "responsavel": form.inspector_name,
                "data_vistoria": form.inspection_date,
                "observacoes": form.technical_notes,
                "acao_imediata": form.immediate_action,
            },
            photos=[{"path": p.file_path, "description": p.description_ai or ""} for p in photos],
            context=context_consolidado,
        )

        out_docs = []
        for doc in docs_payload:
            gdoc = GeneratedDocument(
                process_id=process_id,
                fund_code=fundo,
                document_type=doc["type"],
                file_path=doc["path"],
                mime_type=doc["mime"],
                size_bytes=os.path.getsize(doc["path"]) if os.path.exists(doc["path"]) else None,
                prompt_version=doc.get("prompt_version"),
                inputs_hash=doc.get("inputs_hash"),
            )
            db.add(gdoc)
            db.flush()
            out_docs.append({
                "id": gdoc.id,
                "name": doc["name"],
                "type": gdoc.document_type,
                "url": f"/documentos/{gdoc.id}",
            })

        process.status = "documents_generated"
        db.commit()
        return {"documents": out_docs}
    finally:
        db.close()


@app.get("/documentos/{document_id}")
def get_document(document_id: int):
    db = SessionLocal()
    try:
        doc = db.query(GeneratedDocument).get(document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Documento não encontrado")
        stream, mime, filename = open_document_stream(doc.file_path)
        return StreamingResponse(stream, media_type=mime, headers={"Content-Disposition": f"inline; filename={filename}"})
    finally:
        db.close()


@app.get("/")
def health():
    return {"status": "ok"}


