from typing import Dict, Any, List


def _require(obj: Dict[str, Any], path: str) -> bool:
    cur: Any = obj
    for part in path.split('.'):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return False
    if isinstance(cur, (str, list)):
        return len(cur) > 0
    return cur is not None


def preflight_for_fund(fund_code: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Retorna pendências por documento conforme regras simples.
    Não bloqueia geração; serve para UX na etapa 3.
    """
    docs: List[Dict[str, Any]] = []

    def add(doc_type: str, requirements: List[str]):
        missing = [r for r in requirements if not _require(context, r)]
        docs.append({
            "doc_type": doc_type,
            "missing": missing,
            "status": "ok" if not missing else "pending",
        })

    if fund_code == "FNMC":
        add("OficioNotificacao", ["form.responsavel", "form.data_vistoria", "zone.id"])
        add("RelatorioTecnicoRisco", ["form.observacoes", "photos", "zone.coordinates.lat", "zone.coordinates.lon"])
        add("PlanoAcaoEmergencial", ["form.acao_imediata"]) 
        add("OrcamentoIntervencoes", ["financials.custo_prevencao_total"]) 
    elif fund_code == "MDR":
        add("PlanoTrabalhoPrevencao", [
            "zone.id", "zone.coordinates.lat", "zone.coordinates.lon",
            "financials.custo_prevencao_total", "form.responsavel", "photos"
        ])
    else:
        add("Generic", ["zone.id"])  # fallback leve

    overall = "ok" if all(d["status"] == "ok" for d in docs) else "pending"
    return {"fund_code": fund_code, "documents": docs, "status": overall}


