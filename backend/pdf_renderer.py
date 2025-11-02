from typing import List
from fpdf import FPDF


def create_pdf_from_text(path: str, title: str, paragraphs: List[str]) -> None:
    """Gera PDF leve e compatível com Windows usando fpdf2 (sem binários nativos)."""
    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.multi_cell(0, 10, title)
    pdf.ln(4)
    pdf.set_font("Helvetica", size=11)
    for p in paragraphs:
        for line in p.split("\n\n"):
            pdf.multi_cell(0, 7, line)
            pdf.ln(2)
    pdf.output(path)


def build_pdf_bytes(title: str, paragraphs: List[str]) -> bytes:
    """Retorna bytes de um PDF simples (fpdf2) para envio direto na resposta HTTP."""
    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.multi_cell(0, 10, title)
    pdf.ln(4)
    pdf.set_font("Helvetica", size=11)
    for p in paragraphs:
        for line in p.split("\n\n"):
            pdf.multi_cell(0, 7, line)
            pdf.ln(2)
    # fpdf2 retorna str Latin-1 quando dest='S'
    return pdf.output(dest='S').encode('latin-1')


