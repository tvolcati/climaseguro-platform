import json
from typing import Any, Dict

from backend.database import SessionLocal
from backend.models import PreventionProcess, ProcessForm, ProcessPhoto


def build_context(process_id: int) -> Dict[str, Any]:
    """
    Consolida o contexto do processo a partir de 'context_json' + tabelas relacionadas.
    Garante chaves padrão e normalização mínima de tipos.
    """
    db = SessionLocal()
    try:
        process = db.query(PreventionProcess).get(process_id)
        if not process:
            raise ValueError("Processo não encontrado")

        base_ctx: Dict[str, Any] = {}
        try:
            base_ctx = json.loads(process.context_json or "{}")
        except Exception:
            base_ctx = {}

        # Fotos a partir da tabela (fonte confiável)
        photos = db.query(ProcessPhoto).filter_by(process_id=process_id).all()
        base_ctx["photos"] = [
            {
                "path": p.file_path,
                "description": p.description_ai or "",
            }
            for p in photos
        ]

        # Formulário mais recente
        form = (
            db.query(ProcessForm)
            .filter_by(process_id=process_id)
            .order_by(ProcessForm.id.desc())
            .first()
        )
        if form:
            base_ctx["form"] = {
                "responsavel": form.inspector_name,
                "data_vistoria": form.inspection_date,
                "observacoes": form.technical_notes,
                "acao_imediata": form.immediate_action,
            }

        # Defaults mínimos
        base_ctx.setdefault("zone", {})
        base_ctx.setdefault("demographics", {})
        base_ctx.setdefault("financials", {})

        return base_ctx
    finally:
        db.close()


