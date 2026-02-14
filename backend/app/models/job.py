"""
CronOpus Job Model
Based on PRD V1.4 Section 5 - Tabla: Jobs
"""
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from enum import Enum


class JobSource(str, Enum):
    """Source of job listings per PRD."""
    PRACTICAS_PE = "PRACTICAS_PE"
    COMPUTRABAJO = "COMPUTRABAJO"
    MANUAL = "MANUAL"


class JobStatus(str, Enum):
    """Job status lifecycle per PRD."""
    NEW = "NEW"
    SAVED = "SAVED"
    DISCARDED = "DISCARDED"
    GENERATED = "GENERATED"
    APPLIED = "APPLIED"
    EXPIRED = "EXPIRED"


class Job(SQLModel, table=True):
    """
    Job listing model per PRD Section 5.
    
    Represents a job offer scraped from external sources.
    """
    __tablename__ = "jobs"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    source: JobSource = Field(description="Source portal (PRACTICAS_PE, COMPUTRABAJO)")
    external_id: str = Field(index=True, description="Original ID from source (for deduplication)")
    title: str = Field(description="Job title")
    company: str = Field(description="Company name")
    location: str = Field(description="Geographic location (Lima, Remoto, etc.)")
    salary: Optional[str] = Field(default=None, description="Salary if available (free text)")
    description: str = Field(description="Full job description for AI prompt")
    raw_html: Optional[str] = Field(default=None, description="Raw HTML for debugging")
    status: JobStatus = Field(default=JobStatus.NEW, description="Current job status")
    url: str = Field(description="Link to apply manually")
    applied_at: Optional[datetime] = Field(default=None, description="Date marked as APPLIED")
    match_score: Optional[int] = Field(default=None, description="AI relevance score 0-100 (Phase 2)")
    
    # Timestamps (implicit per PRD note)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
