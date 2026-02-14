"""
Tests for Profile model (Task 6.5.1). TDD: written before implementation.
"""
import pytest
from pathlib import Path
from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models.profile import Profile

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Estructura mínima para tests (alineada con profile.json)
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


# Estructura completa para round-trip
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


class TestProfileModel:
    """Tests for Profile model per Task 6.5.1."""

    def test_profile_model_exists(self):
        """Profile model should be importable from app.models.profile."""
        assert Profile is not None

    def test_profile_model_has_required_fields(self):
        """Profile model should have id, data, created_at, updated_at."""
        required_fields = ["id", "data", "created_at", "updated_at"]
        model_fields = Profile.model_fields.keys()
        for field in required_fields:
            assert field in model_fields, f"Profile model must have '{field}' field"

    def test_profile_data_is_dict(self):
        """Profile.data accepts a dict compatible with profile.json."""
        profile = Profile(data=MINIMAL_DATA)
        assert isinstance(profile.data, dict)
        assert profile.data["full_name"] == "Test User"
        assert profile.data["contact"]["email"] == "t@t.com"

    def test_profile_can_be_created_and_retrieved(self):
        """Create Profile with minimal data, persist, retrieve, verify."""
        create_db_and_tables()
        with Session(engine) as session:
            profile = Profile(data=MINIMAL_DATA)
            session.add(profile)
            session.commit()
            session.refresh(profile)
            pk = profile.id

        with Session(engine) as session:
            retrieved = session.get(Profile, pk)
            assert retrieved is not None
            assert retrieved.data["full_name"] == "Test User"
            assert retrieved.data["summary"] == "Summary"

    def test_profile_data_stores_full_structure(self):
        """Create Profile with full structure (contact, skills, experience, etc.), verify round-trip."""
        create_db_and_tables()
        with Session(engine) as session:
            profile = Profile(data=FULL_STRUCTURE)
            session.add(profile)
            session.commit()
            session.refresh(profile)
            pk = profile.id

        with Session(engine) as session:
            retrieved = session.get(Profile, pk)
            assert retrieved is not None
            assert retrieved.data["full_name"] == "Full Name"
            assert retrieved.data["contact"]["links"]["linkedin"] == "https://linkedin.com/test"
            assert len(retrieved.data["experience"]) == 1
            assert retrieved.data["experience"][0]["role"] == "Dev"
            assert len(retrieved.data["projects"]) == 1
            assert len(retrieved.data["education"]) == 1
            assert len(retrieved.data["certifications"]) == 1
