"""
CronOpus Template Model
Based on PRD V1.4 Section 5 - Tabla: Templates
"""
from sqlmodel import SQLModel, Field
from datetime import datetime
from uuid import UUID, uuid4


class Template(SQLModel, table=True):
    """
    LaTeX template model per PRD Section 5.
    
    Represents a CV template with version tracking.
    Uses monolithic approach with delimiters per PRD Section 4.D.
    """
    __tablename__ = "templates"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(description="Descriptive name (e.g., 'CV Backend 2026')")
    version: int = Field(default=1, description="Version number for tracking")
    content: str = Field(description="LaTeX code base (monolithic)")
    is_active: bool = Field(default=False, description="Only one active at a time")
    
    # Timestamps (implicit per PRD note)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
