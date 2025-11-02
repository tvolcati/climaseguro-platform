from dataclasses import dataclass, asdict
from typing import List, Dict, Any
import datetime as dt
import hashlib
import json
import os
from jinja2 import Environment, FileSystemLoader, select_autoescape
from backend.pdf_renderer import create_pdf_from_text
from backend.services.gemini import generate_legal_document_text

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
        code="MDR",
        name="MDR/SEDEC – Prevenção e Resposta a Desastres",
        required_documents=[
            "PlanoTrabalhoPrevencao",
        ],
    ),
    FundDefinition(
        code="FEP-EXEMPLO",
        name="Fundo Estadual de Proteção",
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


def _compose_fallback_legal_text(fund_name: str, doc_type: str, context: Dict[str, Any], form: Dict[str, Any]) -> str:
    """Cria um texto formal sem imprimir o JSON do contexto (fallback sem IA)."""
    zone = (context or {}).get("zone", {})
    coords = zone.get("coordinates", {})
    demographics = (context or {}).get("demographics", {})
    financials = (context or {}).get("financials", {})

    partes: list[str] = []
    partes.append(f"{fund_name} — {doc_type}")
    partes.append("\nI. Introdução\nEste documento tem por finalidade instruir o processo administrativo de prevenção/resposta a desastres, em conformidade com as normas aplicáveis, descrevendo a situação de risco identificada e as medidas propostas.")

    partes.append(
        f"\nII. Contextualização da Área\nA área avaliada apresenta nível de risco '{zone.get('level','N/D')}'. Coordenadas aproximadas: lat {coords.get('lat','N/D')}, lon {coords.get('lon','N/D')}. População potencialmente afetada: {demographics.get('populacao_estimada','N/D')} pessoas, com {demographics.get('total_imoveis','N/D')} domicílios estimados."
    )

    partes.append(
        f"\nIII. Fundamentação Técnica\nA vistoria realizada por {form.get('responsavel','responsável técnico')} em {form.get('data_vistoria','data N/D')} constatou os seguintes elementos: {form.get('observacoes','N/D')}."
    )

    partes.append(
        "\nIV. Análise Financeira\nCom base nos parâmetros de referência adotados, estimam‑se os custos de prevenção em "
        f"R$ {financials.get('custo_prevencao_total','N/D')} e os custos de desastre evitados em R$ {financials.get('custo_desastre_total','N/D')}, "
        f"com economia potencial aproximada de R$ {financials.get('economia_estimada','N/D')} (ROI {financials.get('roi_percent','N/D')}%)."
    )

    partes.append(
        f"\nV. Medidas Propostas\n{form.get('acao_imediata','N/D')}"
    )

    partes.append(
        "\nVI. Conclusão\nDiante do exposto, propõe‑se o prosseguimento dos trâmites para captação de recursos junto ao fundo indicado, observadas as condicionantes técnicas, ambientas e orçamentárias, com responsabilização das unidades competentes para execução e monitoramento."
    )

    return "\n\n".join(partes)


def compose_action_plan_text(context: Dict[str, Any]) -> str:
    zone = context.get("zone", {})
    coords = zone.get("coordinates", {})
    demographics = context.get("demographics", {})
    financials = context.get("financials", {})

    parts: list[str] = []
    parts.append("Plano de Ação Municipal para Redução de Riscos")
    parts.append(
        f"\n1. Objetivo\nEstabelecer diretrizes e ações para reduzir a vulnerabilidade da população local diante de eventos hidrometeorológicos e movimentos de massa, preservando vidas, patrimônio e serviços essenciais."
    )
    parts.append(
        f"\n2. Contexto e Diagnóstico\nÁrea em nível de risco '{zone.get('level','N/D')}'. Coordenadas aproximadas: lat {coords.get('lat','N/D')}, lon {coords.get('lon','N/D')}. População potencialmente afetada: {demographics.get('populacao_estimada','N/D')} pessoas, com {demographics.get('total_imoveis','N/D')} domicílios."
    )
    parts.append(
        "\n3. Diretrizes\n(a) Prevenção e mitigação como prioridade; (b) Integração intersetorial entre obras, meio ambiente e assistência social; (c) Transparência e controle social; (d) Priorização de áreas com maior densidade populacional e criticidade."
    )
    parts.append(
        "\n4. Ações Imediatas (0–90 dias)\n• Limpeza de drenagens e bocas de lobo; • Sinalização de áreas de risco; • Campanhas educativas de autoproteção; • Vistorias recorrentes após chuvas intensas; • Plano de comunicação de alerta."
    )
    parts.append(
        "\n5. Ações Estruturantes (6–24 meses)\n• Obras de micro/macro‑drenagem; • Contenção de encostas; • Recuperação de APPs; • Realocação assistida quando necessário; • Sistema de monitoramento pluviométrico."
    )
    parts.append(
        f"\n6. Orçamento de Referência\nEstimativa preliminar de prevenção: R$ {financials.get('custo_prevencao_total','N/D')}. Eventuais complementações via fundos específicos poderão ser consideradas em fase de projeto executivo."
    )
    parts.append(
        "\n7. Governança e Responsabilidades\nCoordenação da Defesa Civil municipal; unidades executoras: Obras/Urbanismo, Meio Ambiente, Assistência Social; apoio das Secretarias de Finanças e Comunicação; articulação com órgãos estaduais/federais."
    )
    parts.append(
        "\n8. Indicadores de Monitoramento\n• Áreas críticas saneadas; • Redução de pontos de alagamento; • N° de famílias atendidas; • Tempo de resposta a eventos; • Capacitações realizadas."
    )
    parts.append(
        "\n9. Riscos e Mitigações\nRisco de insuficiência orçamentária (mitigar com priorização e captação); riscos ambientais (licenciamento e condicionantes); riscos de execução (gestão contratual e fiscalização)."
    )
    parts.append(
        "\n10. Conclusão\nEste plano norteia a prefeitura para adoção de medidas proporcionais e efetivas, com foco na proteção de vidas e na resiliência urbana, preservando a discricionariedade técnica e orçamentária."
    )
    return "\n\n".join(parts)


def generate_documents_for_fund(
    fund_code: str,
    process_id: int,
    zone_id: int | None,
    form_data: Dict[str, Any],
    photos: List[Dict[str, Any]],
    context: Dict[str, Any] | None = None,
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
    if context is not None:
        base_payload["context"] = context

    # Ambiente de templates
    templates_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "templates"))
    env = Environment(loader=FileSystemLoader(templates_root), autoescape=select_autoescape(enabled_extensions=("html", "xml")))

    for doc_type in fund.required_documents:
        title = f"{fund.name} - {doc_type}"
        # 0) Tentar geração via LLM (texto jurídico extenso)
        llm_text = None
        try:
            sections_map = {
                "OficioNotificacao": [
                    "Introdução e finalidade do ofício",
                    "Contextualização da área e risco",
                    "Orientações aos moradores",
                    "Disposições finais e assinatura",
                ],
                "RelatorioTecnicoRisco": [
                    "Sumário executivo",
                    "Base legal e competência administrativa",
                    "Metodologia e diagnóstico técnico",
                    "Análise de risco e impactos",
                    "Medidas propostas e priorização",
                    "Conclusão e encaminhamentos",
                ],
                "PlanoAcaoEmergencial": [
                    "Objetivo e escopo do plano",
                    "Cenários e níveis de acionamento",
                    "Protocolos operacionais e responsabilidades",
                    "Recursos, logística e comunicação",
                    "Cronograma e monitoramento",
                ],
                "OrcamentoIntervencoes": [
                    "Premissas e critérios de estimativa",
                    "Composição de custos e BDI (visão narrativa)",
                    "Benefícios esperados e custo-efetividade",
                    "Riscos orçamentários e mitigação",
                ],
                "PlanoTrabalhoPrevencao": [
                    "Identificação do ente e objeto",
                    "Justificativa técnica e jurídica",
                    "Descrição detalhada das ações com localização",
                    "Orçamento e cronograma físico-financeiro (narrativo)",
                    "Metas, indicadores e governança",
                ],
                "RelatorioFotografico": [
                    "Contexto e metodologia",
                    "Descrição das evidências fotográficas",
                    "Conclusões técnicas",
                ],
                "TermoResponsabilidadeTecnica": [
                    "Identificação do responsável",
                    "Declaração de responsabilidade",
                    "Limitações e observâncias normativas",
                ],
            }
            doc_sections = sections_map.get(doc_type, [
                "Introdução",
                "Contexto",
                "Análise",
                "Conclusão",
            ])
            llm_text = generate_legal_document_text(fund.name, doc_type, context or base_payload, doc_sections)
        except Exception as e:
            print(f"[doc_gen] LLM indisponível, usando template: {e}")

        # 1) Se LLM gerou, produzir PDF com texto jurídico
        if llm_text:
            filename_pdf = f"{doc_type}_{process_id}.pdf"
            out_path = save_document(process_id, filename_pdf, b"")
            try:
                create_pdf_from_text(out_path, title, [llm_text])
                documents.append({
                    "name": title,
                    "type": doc_type,
                    "path": out_path,
                    "mime": "application/pdf",
                    "prompt_version": "v2-llm-legal",
                    "inputs_hash": hashlib.sha256(json.dumps(base_payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest(),
                })
                continue
            except Exception as e:
                print(f"[doc_gen] Falha ao renderizar PDF do LLM: {e}")

        # 2) Tenta carregar template TXT/Jinja e gerar PDF simples
        template_rel_path = None
        if fund.code == "FNMC":
            template_rel_path = os.path.join("fnmc", f"{doc_type}.txt.j2")
            template_rel_url = f"fnmc/{doc_type}.txt.j2"
        elif fund.code == "MDR":
            template_rel_path = os.path.join("mdr", f"{doc_type}.txt.j2")
            template_rel_url = f"mdr/{doc_type}.txt.j2"
        elif fund.code == "FEP-EXEMPLO":
            template_rel_path = os.path.join("fep-exemplo", f"{doc_type}.txt.j2")
            template_rel_url = f"fep-exemplo/{doc_type}.txt.j2"
        else:
            template_rel_url = None

        pdf_generated = False
        out_path = None
        try:
            if template_rel_path and os.path.exists(os.path.join(templates_root, template_rel_path)):
                # Jinja funciona melhor com separador '/'
                tpl_name = template_rel_url or template_rel_path.replace(os.sep, "/")
                template = env.get_template(tpl_name)
                rendered_text = template.render(context=context or {}, fund_name=fund.name)
                filename_pdf = f"{doc_type}_{process_id}.pdf"
                out_path = save_document(process_id, filename_pdf, b"")  # criar caminho
                # Renderizar PDF simples
                create_pdf_from_text(out_path, title, [rendered_text])
                pdf_generated = True
        except Exception as e:
            print(f"[doc_gen] Falha ao gerar PDF com template {template_rel_path}: {e}")

        if not pdf_generated:
            # Fallback: texto jurídico composto localmente, sem JSON
            content_text = _compose_fallback_legal_text(fund.name, doc_type, context or {}, form_data or {})
            filename_pdf = f"{doc_type}_{process_id}.pdf"
            out_path = save_document(process_id, filename_pdf, b"")
            try:
                create_pdf_from_text(out_path, title, [content_text])
                pdf_generated = True
            except Exception as e:
                print(f"[doc_gen] Falha ao renderizar PDF fallback: {e}")
                # como último recurso, salva TXT
                filename = f"{doc_type}_{process_id}.txt"
                out_path = save_document(process_id, filename, content_text.encode("utf-8"))

        documents.append({
            "name": title,
            "type": doc_type,
            "path": out_path,
            "mime": "application/pdf" if pdf_generated else "text/plain",
            "prompt_version": "v1",
            "inputs_hash": hashlib.sha256(json.dumps(base_payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest(),
        })

    return documents


