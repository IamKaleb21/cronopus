"""
ProfileData Pydantic schemas (Task 6.5.2).
Rich structure for profile: contact, summary, skills by groups,
experience[], projects[], education[], certifications[].
"""
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ContactLinks(BaseModel):
    """Optional social/portfolio links."""

    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None


class Contact(BaseModel):
    """Contact info: phone, email, location, links."""

    phone: str
    email: str
    location: str
    links: Optional[ContactLinks] = None


class LanguageSpoken(BaseModel):
    """Language skill: name, level, optional note."""

    name: str
    level: str
    note: Optional[str] = None


class Skills(BaseModel):
    """Skills grouped by category."""

    model_config = ConfigDict(extra="ignore")

    languages: Optional[list[str]] = None
    frontend: Optional[list[str]] = None
    backend_db: Optional[list[str]] = None
    mobile: Optional[list[str]] = None
    data_ml: Optional[list[str]] = None
    infra_tools: Optional[list[str]] = None
    libraries: Optional[list[str]] = None
    languages_spoken: Optional[list[LanguageSpoken]] = None


class ExperienceItem(BaseModel):
    """Single experience entry."""

    id: str
    role: str
    company: str
    location: str
    from_: str = Field(alias="from")
    to: str
    bullets: list[str]


class ProjectItem(BaseModel):
    """Single project entry."""

    id: str
    name: str
    stack: list[str]
    from_: str = Field(alias="from")
    to: str
    bullets: list[str]


class EducationItem(BaseModel):
    """Single education entry."""

    institution: str
    location: str
    degree: str
    from_: str = Field(alias="from")
    to: str


class CertificationItem(BaseModel):
    """Single certification entry."""

    name: str
    issuer: str
    description: str


class ProfileData(BaseModel):
    """Full profile structure for Jinja template rendering."""

    full_name: str
    title: str
    contact: Contact
    summary: str
    skills: Skills
    experience: list[ExperienceItem]
    projects: list[ProjectItem]
    education: list[EducationItem]
    certifications: list[CertificationItem]


def profile_to_profile_data(profile: "Profile") -> ProfileData:
    """Convert Profile (DB) to ProfileData. Raises ValidationError if profile.data is invalid."""
    return ProfileData.model_validate(profile.data)
