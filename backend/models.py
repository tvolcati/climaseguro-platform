from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func


Base = declarative_base()


class PreventionProcess(Base):
    __tablename__ = "prevention_process"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, nullable=True)
    status = Column(String(50), default="draft")
    # Contexto consolidado do processo (JSON serializado)
    context_json = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    photos = relationship("ProcessPhoto", back_populates="process")
    forms = relationship("ProcessForm", back_populates="process")
    documents = relationship("GeneratedDocument", back_populates="process")


class ProcessPhoto(Base):
    __tablename__ = "process_photo"

    id = Column(Integer, primary_key=True, index=True)
    process_id = Column(Integer, ForeignKey("prevention_process.id"), nullable=False)
    file_path = Column(Text, nullable=False)
    description_ai = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    process = relationship("PreventionProcess", back_populates="photos")


class ProcessForm(Base):
    __tablename__ = "process_form"

    id = Column(Integer, primary_key=True, index=True)
    process_id = Column(Integer, ForeignKey("prevention_process.id"), nullable=False)
    inspector_name = Column(String(255), nullable=False)
    inspection_date = Column(String(50), nullable=False)
    technical_notes = Column(Text, nullable=True)
    immediate_action = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    process = relationship("PreventionProcess", back_populates="forms")


class GeneratedDocument(Base):
    __tablename__ = "generated_document"

    id = Column(Integer, primary_key=True, index=True)
    process_id = Column(Integer, ForeignKey("prevention_process.id"), nullable=False)
    fund_code = Column(String(50), nullable=False)
    document_type = Column(String(100), nullable=False)
    file_path = Column(Text, nullable=False)
    mime_type = Column(String(100), nullable=True)
    size_bytes = Column(Integer, nullable=True)
    # Auditoria
    prompt_version = Column(String(50), nullable=True)
    inputs_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    process = relationship("PreventionProcess", back_populates="documents")


