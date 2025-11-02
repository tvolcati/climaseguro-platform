from dataclasses import dataclass, asdict
from typing import List, Dict, Any
import datetime as dt

from backend.storage import save_document


@dataclass
class FundDefinition:
    code: str
    name: str
    required_documents: List[str]

    def dict(self):
        return asdict(self)


FUNDS: List[FundDefinition] = [
    FundDefinition(
        code="FNMC",
        name="Fundo Nacional sobre Mudança do Clima",
        required_documents=[
            "OficioNotificacao",
            "RelatorioTecnicoRisco",
            "PlanoAcaoEmergencial",
            "OrcamentoIntervencoes",
        ],
    ),
    FundDefinition(
        code="FEP-EXEMPLO",
        name="Fundo Estadual de Proteção (exemplo)",
        required_documents=[
            "RelatorioFotografico",
            "TermoResponsabilidadeTecnica",
        ],
    ),
]


def list_funds() -> List[FundDefinition]:
    return FUNDS


def _render_text_document(title: str, payload: Dict[str, Any]) -> bytes:
    lines = [title, "" ]
    lines.append(f"Gerado em: {dt.datetime.now().strftime('%d/%m/%Y %H:%M')}\n")
    lines.append("Contexto do Processo:\n")
    for k, v in payload.items():
        if isinstance(v, (dict, list)):
            lines.append(f"- {k}: {v}\n")
        else:
            lines.append(f"- {k}: {v}\n")
    return "\n".join(lines).encode("utf-8")


def generate_documents_for_fund(
    fund_code: str,
    process_id: int,
    zone_id: int | None,
    form_data: Dict[str, Any],
    photos: List[Dict[str, Any]],
):
    fund = next((f for f in FUNDS if f.code == fund_code), None)
    if not fund:
        raise ValueError("Fundo não suportado")

    documents = []
    base_payload = {
        "process_id": process_id,
        "zone_id": zone_id,
        "form": form_data,
        "photos": photos,
    }

    for doc_type in fund.required_documents:
        title = f"{fund.name} - {doc_type}"
        content = _render_text_document(title, base_payload)
        filename = f"{doc_type}_{process_id}.txt"
        path = save_document(process_id, filename, content)
        documents.append({
            "name": title,
            "type": doc_type,
            "path": path,
            "mime": "text/plain",
        })

    return documents


