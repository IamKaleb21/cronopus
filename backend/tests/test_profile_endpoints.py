"""
Tests for GET /api/profile and PATCH /api/profile. TDD.
"""
from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models.profile import Profile
from app.schemas.profile_data import ProfileData
from app.services.seed_profile import run_seed

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROFILE_JSON_PATH = PROJECT_ROOT / "docs" / "profile.json"

# Valid profile body (ProfileData structure)
VALID_PROFILE_BODY = {
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


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


@pytest.fixture
def settings_with_token(monkeypatch):
    """Settings that accept Bearer token 'test-token'."""
    class MockSettings:
        effective_master_password = lambda self: "dev"
        auth_token = "test-token"
        database_url = "sqlite:///./cronopus_dev.db"
        cors_origins = ["http://localhost:3000"]
        gemini_api_key = ""
        gemini_model = "gemini-2.5-flash"
        master_password = ""
        telegram_bot_token = ""
        telegram_chat_id = ""
    from app import main as main_module
    monkeypatch.setattr(main_module, "settings", MockSettings())
    return MockSettings


@pytest.fixture
def auth_headers(settings_with_token):
    return {"Authorization": "Bearer test-token"}


class TestGetProfile:
    """GET /api/profile."""

    def test_get_profile_without_auth_returns_401(self, client):
        """GET /api/profile without token returns 401."""
        response = client.get("/api/profile")
        assert response.status_code == 401

    def test_get_profile_with_auth_and_profile_returns_200(self, client, auth_headers):
        """GET /api/profile with token and Profile in DB returns 200 and profile.data."""
        create_db_and_tables()
        run_seed(json_path=PROFILE_JSON_PATH)

        response = client.get("/api/profile", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "full_name" in data
        assert data["full_name"] == "Aarón Kaleb Arteaga Rodríguez"
        assert "contact" in data
        assert "experience" in data

    def test_get_profile_no_profile_returns_503(self, client, auth_headers):
        """GET /api/profile when no Profile in DB returns 503."""
        create_db_and_tables()
        with Session(engine) as session:
            for p in session.exec(select(Profile)).all():
                session.delete(p)
            session.commit()

        response = client.get("/api/profile", headers=auth_headers)
        assert response.status_code == 503
        assert "Perfil no configurado" in response.json().get("detail", "") or "Profile no configurado" in response.json().get("detail", "")


class TestPatchProfile:
    """PATCH /api/profile."""

    def test_patch_profile_without_auth_returns_401(self, client):
        """PATCH /api/profile without token returns 401."""
        response = client.patch("/api/profile", json=VALID_PROFILE_BODY)
        assert response.status_code == 401

    def test_patch_profile_with_auth_and_profile_returns_200(self, client, auth_headers):
        """PATCH /api/profile with valid body updates profile and returns 200."""
        create_db_and_tables()
        run_seed(json_path=PROFILE_JSON_PATH)

        updated = {**VALID_PROFILE_BODY, "full_name": "Updated Name"}
        response = client.patch("/api/profile", json=updated, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["full_name"] == "Updated Name"

        with Session(engine) as session:
            profile = session.exec(select(Profile)).first()
            assert profile is not None
            assert profile.data["full_name"] == "Updated Name"

    def test_patch_profile_invalid_body_returns_422(self, client, auth_headers):
        """PATCH /api/profile with invalid body (missing full_name) returns 422."""
        create_db_and_tables()
        run_seed(json_path=PROFILE_JSON_PATH)

        invalid = {**VALID_PROFILE_BODY}
        del invalid["full_name"]
        response = client.patch("/api/profile", json=invalid, headers=auth_headers)
        assert response.status_code == 422

    def test_patch_profile_no_profile_returns_503(self, client, auth_headers):
        """PATCH /api/profile when no Profile in DB returns 503."""
        create_db_and_tables()
        with Session(engine) as session:
            for p in session.exec(select(Profile)).all():
                session.delete(p)
            session.commit()

        response = client.patch("/api/profile", json=VALID_PROFILE_BODY, headers=auth_headers)
        assert response.status_code == 503
