"""
AdaptedContent Pydantic schema (Task 6.5.4).
Job-adapted content from Gemini: summary, experience_adapted, projects_adapted, skills_adapted.
"""
from pydantic import BaseModel


class ExperienceAdapted(BaseModel):
    """Adapted bullets for a single experience item."""

    experience_id: str
    bullets: list[str]


class ProjectAdapted(BaseModel):
    """Adapted bullets for a single project item."""

    project_id: str
    bullets: list[str]


class AdaptedContent(BaseModel):
    """Content adapted by AI for a specific job."""

    summary: str = ""
    experience_adapted: list[ExperienceAdapted] = []
    projects_adapted: list[ProjectAdapted] = []
    skills_adapted: dict[str, list[str]] | None = None
