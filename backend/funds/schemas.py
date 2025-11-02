from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class FileConstraints(BaseModel):
    max_size_mb: Optional[float] = None
    max_pages: Optional[int] = None
    orientation: Optional[str] = None


class RequiredDocument(BaseModel):
    doc_type: str
    title_official: Optional[str] = None
    format: Optional[str] = None
    template_url: Optional[str] = None
    content_requirements: Optional[List[str]] = None
    signatures: Optional[List[str]] = None
    attachments_required: Optional[List[str]] = None
    file_constraints: Optional[FileConstraints] = None


class SubmissionChannel(BaseModel):
    platform: Optional[str] = None
    url: Optional[str] = None


class TicketRange(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    notes: Optional[str] = None


class SubmissionStep(BaseModel):
    step: Optional[int] = None
    name: Optional[str] = None
    who: Optional[str] = None
    details: Optional[str] = None
    sla_days: Optional[int] = None


class DecisionTimeline(BaseModel):
    min: Optional[int] = None
    max: Optional[int] = None


class FundItem(BaseModel):
    fund_name: str
    alias: Optional[List[str]] = None
    jurisdiction: Optional[str] = None
    managing_agency: Optional[str] = None
    legal_basis: Optional[List[str]] = None
    program_focus: Optional[List[str]] = None
    eligible_beneficiaries: Optional[List[str]] = None
    eligible_projects: Optional[List[str]] = None
    funding_modalities: Optional[List[str]] = None
    typical_ticket_range_brl: Optional[TicketRange] = None
    cofinancing_requirements: Optional[str] = None
    submission_channel: Optional[SubmissionChannel] = None
    required_documents: Optional[List[RequiredDocument]] = None
    submission_steps: Optional[List[SubmissionStep]] = None
    decision_timeline_days: Optional[DecisionTimeline] = None
    monitoring_reporting: Optional[List[str]] = None
    common_pitfalls: Optional[List[str]] = None
    sources: Optional[List[str]] = None
    last_verified_at: Optional[str] = None


class FundsOverview(BaseModel):
    funds: List[FundItem]


class MandatorySection(BaseModel):
    section: str
    description: Optional[str] = None
    evidence: Optional[List[str]] = None


class FormattingRules(BaseModel):
    file_type: Optional[str] = None
    font_min_size: Optional[int] = None
    margins: Optional[str] = None
    max_pages: Optional[int] = None


class DocumentTemplate(BaseModel):
    fund_name: str
    doc_type: str
    mandatory_sections: List[MandatorySection]
    data_inputs_mapping: Optional[Dict[str, Any]] = None
    formatting_rules: Optional[FormattingRules] = None
    signature_requirements: Optional[List[str]] = None
    validation_checklist: Optional[List[str]] = None
    sources: Optional[List[str]] = None
    last_verified_at: Optional[str] = None


class DocumentTemplatesOutline(BaseModel):
    document_templates: List[DocumentTemplate]


