"""
CronOpus Profile Model
Task 6.5.1 - Single-user profile aligned with docs/cv_master.tex sections.
"""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, JSON
from sqlmodel import SQLModel, Field


class Profile(SQLModel, table=True):
    """
    Single-user profile model per Task 6.5.1.
    Stores the full profile structure (full_name, title, contact, summary,
    skills, experience, projects, education, certifications) in a JSON column.
    """
    __tablename__ = "profiles"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    data: dict = Field(sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
