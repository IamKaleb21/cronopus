"""
Tests for ProfileData schema and Profile (DB) -> ProfileData conversion (Task 6.5.2). TDD.
"""
import json
import pytest
from pathlib import Path
from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models.profile import Profile

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROFILE_JSON_PATH = PROJECT_ROOT / "docs" / "profile.json"

# Estructura mínima (alineada con profile.json)
MINIMAL_DATA = {
    "full_name": "Test User",
    "title": "Developer",
    "contact": {"phone": "+51", "email": "t@t.com", "location": "Lima", "links": {}},
    "summary": "Summary",
    "skills": {},
    "experience": [],
    "projects": [],
    "education": [],
    "certifications": [],
}

# Estructura completa
FULL_STRUCTURE = {
    "full_name": "Full Name",
    "title": "Full Stack Engineer",
    "contact": {
        "phone": "+51 999",
        "email": "full@example.com",
        "location": "Lima",
        "links": {"linkedin": "https://linkedin.com/test", "github": "https://github.com/test"},
    },
    "summary": "Professional summary text.",
    "skills": {
        "languages": ["Python", "JavaScript"],
        "frontend": ["React"],
    },
    "experience": [
        {"id": "exp-1", "role": "Dev", "company": "Co", "location": "Lima", "from": "2024-01", "to": "Presente", "bullets": ["Bullet 1"]},
    ],
    "projects": [
        {"id": "proj-1", "name": "Project", "stack": ["Python"], "from": "2024", "to": "Presente", "bullets": ["P1"]},
    ],
    "education": [
        {"institution": "Uni", "location": "Lima", "degree": "Degree", "from": "2020", "to": "2025"},
    ],
    "certifications": [
        {"name": "Cert", "issuer": "Issuer", "description": "Desc"},
    ],
}


class TestProfileDataSchema:
    """Tests for ProfileData Pydantic schema."""

    def test_profile_data_importable(self):
        """ProfileData and auxiliary models importable from app.schemas.profile_data."""
        from app.schemas.profile_data import ProfileData, Contact, Skills, ExperienceItem, ProjectItem

        assert ProfileData is not None
        assert Contact is not None
        assert Skills is not None

    def test_profile_data_has_required_fields(self):
        """ProfileData has top-level fields: full_name, title, contact, summary, skills, experience, projects, education, certifications."""
        from app.schemas.profile_data import ProfileData

        required = ["full_name", "title", "contact", "summary", "skills", "experience", "projects", "education", "certifications"]
        for field in required:
            assert field in ProfileData.model_fields, f"ProfileData must have '{field}'"

    def test_profile_data_parse_from_dict(self):
        """ProfileData.model_validate(dict) parses minimal structure (MINIMAL_DATA)."""
        from app.schemas.profile_data import ProfileData

        pd = ProfileData.model_validate(MINIMAL_DATA)
        assert pd.full_name == "Test User"
        assert pd.title == "Developer"
        assert pd.summary == "Summary"
        assert pd.contact.email == "t@t.com"
        assert pd.experience == []
        assert pd.projects == []

    def test_profile_data_parse_full_structure(self):
        """ProfileData.model_validate(dict) parses FULL_STRUCTURE with experience, projects, education, certifications, skills."""
        from app.schemas.profile_data import ProfileData

        pd = ProfileData.model_validate(FULL_STRUCTURE)
        assert pd.full_name == "Full Name"
        assert len(pd.experience) == 1
        assert pd.experience[0].role == "Dev"
        assert len(pd.projects) == 1
        assert pd.projects[0].name == "Project"
        assert len(pd.education) == 1
        assert pd.education[0].degree == "Degree"
        assert len(pd.certifications) == 1
        assert pd.certifications[0].issuer == "Issuer"
        assert pd.skills.languages == ["Python", "JavaScript"]
        assert pd.skills.frontend == ["React"]

    def test_profile_data_contact_links(self):
        """Contact.links accepts optional linkedin, github, website."""
        from app.schemas.profile_data import ProfileData

        pd = ProfileData.model_validate(FULL_STRUCTURE)
        assert pd.contact.links.linkedin == "https://linkedin.com/test"
        assert pd.contact.links.github == "https://github.com/test"
        assert pd.contact.links.website is None

    def test_profile_data_validates_types(self):
        """Dict with wrong type (e.g. experience as str) raises ValidationError."""
        from pydantic import ValidationError
        from app.schemas.profile_data import ProfileData

        invalid = {**MINIMAL_DATA, "experience": "not a list"}
        with pytest.raises(ValidationError):
            ProfileData.model_validate(invalid)


class TestProfileToProfileDataConversion:
    """Tests for Profile (DB) -> ProfileData conversion."""

    def test_profile_to_profile_data_function_exists(self):
        """profile_to_profile_data function is importable."""
        from app.schemas.profile_data import profile_to_profile_data

        assert callable(profile_to_profile_data)

    def test_profile_to_profile_data_converts_minimal(self):
        """Profile with MINIMAL_DATA -> valid ProfileData with full_name, summary correct."""
        from app.schemas.profile_data import profile_to_profile_data

        profile = Profile(data=MINIMAL_DATA)
        pd = profile_to_profile_data(profile)
        assert pd.full_name == "Test User"
        assert pd.summary == "Summary"
        assert pd.contact.email == "t@t.com"

    def test_profile_to_profile_data_converts_full(self):
        """Profile with FULL_STRUCTURE -> ProfileData with experience[0].role, projects[0].name, etc."""
        from app.schemas.profile_data import profile_to_profile_data

        profile = Profile(data=FULL_STRUCTURE)
        pd = profile_to_profile_data(profile)
        assert pd.experience[0].role == "Dev"
        assert pd.projects[0].name == "Project"
        assert pd.education[0].institution == "Uni"
        assert pd.certifications[0].name == "Cert"

    def test_profile_to_profile_data_raises_on_invalid_data(self):
        """Profile with invalid data (e.g. contact as str) -> ValidationError."""
        from pydantic import ValidationError
        from app.schemas.profile_data import profile_to_profile_data

        profile = Profile(data={**MINIMAL_DATA, "contact": "invalid"})
        with pytest.raises(ValidationError):
            profile_to_profile_data(profile)

    def test_profile_to_profile_data_roundtrip_from_db(self):
        """Create Profile in DB with profile.json data, retrieve, convert to ProfileData, verify full_name."""
        from app.services.seed_profile import run_seed
        from app.schemas.profile_data import profile_to_profile_data

        create_db_and_tables()
        with Session(engine) as session:
            for p in session.exec(select(Profile)).all():
                session.delete(p)
            session.commit()

        run_seed(json_path=PROFILE_JSON_PATH)

        with Session(engine) as session:
            profile = session.exec(select(Profile)).first()
            assert profile is not None
            pd = profile_to_profile_data(profile)
            assert pd.full_name == "Aarón Kaleb Arteaga Rodríguez"
            assert len(pd.experience) > 0
            assert len(pd.projects) > 0
