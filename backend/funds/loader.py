import json
import os
from typing import Optional

from backend.funds.schemas import FundsOverview, DocumentTemplatesOutline


_overview_cache: Optional[FundsOverview] = None
_templates_cache: Optional[DocumentTemplatesOutline] = None


def _read_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def init() -> None:
    """Carrega os JSONs de overview/templates se existirem; valida e mantém em cache.
    Não levanta exceção fatal — se faltarem, seguimos com cache None para não quebrar o fluxo atual.
    """
    global _overview_cache, _templates_cache
    root = os.path.abspath(os.getenv("FUND_DATA_DIR", "./"))
    overview_path = os.path.join(root, "funds_overview.json")
    templates_path = os.path.join(root, "document_templates_outline.json")

    try:
        if os.path.exists(overview_path):
            _overview_cache = FundsOverview(**_read_json(overview_path))
    except Exception as e:
        print(f"[funds.loader] Falha ao carregar funds_overview.json: {e}")
        _overview_cache = None

    try:
        if os.path.exists(templates_path):
            _templates_cache = DocumentTemplatesOutline(**_read_json(templates_path))
    except Exception as e:
        print(f"[funds.loader] Falha ao carregar document_templates_outline.json: {e}")
        _templates_cache = None


def get_overview() -> Optional[FundsOverview]:
    return _overview_cache


def get_templates() -> Optional[DocumentTemplatesOutline]:
    return _templates_cache


