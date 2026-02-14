"""
CronOpus GeneratedCV Model
Based on PRD V1.4 Section 5 - Tabla: GeneratedCVs
"""
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4


class GeneratedCV(SQLModel, table=True):
    """
    Generated CV model per PRD Section 5.
    
    Stores immutable snapshots of generated CVs for history/reference.
    """
    __tablename__ = "generated_cvs"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    job_id: UUID = Field(foreign_key="jobs.id", description="FK → Jobs (1:N relationship)")
    latex_content: str = Field(description="LaTeX code snapshot (immutable)")
    template_id: UUID = Field(foreign_key="templates.id", description="FK → Templates used")
    notes: Optional[str] = Field(default=None, description="User notes (optional)")
    
    # Timestamps (implicit per PRD note)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
