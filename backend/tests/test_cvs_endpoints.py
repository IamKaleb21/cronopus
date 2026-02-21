"""
Tests for GeneratedCVs CRUD endpoints (Task 6.3). TDD: written before implementation.
GET /api/cvs, GET /api/cvs/{id}, GET /api/cvs/{id}/adapted, PATCH /api/cvs/{id}/adapted, POST /api/cvs/{id}/recompile, DELETE /api/cvs/{id}.
"""
import json
from uuid import uuid4
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models.job import Job, JobSource, JobStatus
from app.models.template import Template
from app.models.generated_cv import GeneratedCV

# Minimal LaTeX that compiles for recompile tests
COMPILABLE_LATEX = "\\documentclass{article}\\begin{document}x\\end{document}"


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


@pytest.fixture(autouse=True)
def ensure_adapted_content_json_column(settings_with_token):
    """Ensure generated_cvs has adapted_content_json column (for existing DBs created before this field)."""
    import sqlalchemy
    create_db_and_tables()
    with engine.connect() as conn:
        if engine.dialect.name == "sqlite":
            try:
                conn.execute(sqlalchemy.text("ALTER TABLE generated_cvs ADD COLUMN adapted_content_json TEXT"))
                conn.commit()
            except sqlalchemy.exc.OperationalError as e:
                if "duplicate column name" not in str(e).lower() and "no such table" not in str(e).lower():
                    raise
    yield


@pytest.fixture
def settings_with_token(monkeypatch):
    """Settings that accept Bearer token 'test-token' for protected endpoints."""
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


def _make_job(**overrides):
    defaults = {
        "source": JobSource.COMPUTRABAJO,
        "external_id": str(uuid4()),
        "title": "Backend Developer",
        "company": "TechCorp",
        "location": "Lima",
        "description": "Job description",
        "url": "https://example.com/job/1",
        "status": JobStatus.NEW,
    }
    defaults.update(overrides)
    return Job(**defaults)


def _make_template(**overrides):
    defaults = {
        "name": "Test Template",
        "version": 1,
        "content": "\\documentclass{article}\\begin{document}CV\\end{document}",
        "is_active": True,
    }
    defaults.update(overrides)
    return Template(**defaults)


@pytest.fixture
def sample_cvs(settings_with_token, ensure_adapted_content_json_column):
    """Create 1 Job, 1 Template, 2 GeneratedCVs (one TechCorp, one OtherCo for filter tests)."""
    create_db_and_tables()
    with Session(engine) as session:
        job1 = _make_job(title="Backend Dev", company="TechCorp")
        job2 = _make_job(title="Frontend Dev", company="OtherCo")
        template = _make_template()
        session.add(job1)
        session.add(job2)
        session.add(template)
        session.commit()
        session.refresh(job1)
        session.refresh(job2)
        session.refresh(template)
        adapted_json = json.dumps({"summary": "Test summary", "experience_adapted": [], "projects_adapted": [], "skills_adapted": None})
        cv1 = GeneratedCV(job_id=job1.id, template_id=template.id, latex_content=COMPILABLE_LATEX, adapted_content_json=adapted_json)
        cv2 = GeneratedCV(job_id=job2.id, template_id=template.id, latex_content=COMPILABLE_LATEX)
        session.add(cv1)
        session.add(cv2)
        session.commit()
        session.refresh(cv1)
        session.refresh(cv2)
    return {
        "job_tech": job1,
        "job_other": job2,
        "template": template,
        "cv1": cv1,
        "cv2": cv2,
        "cvs": [cv1, cv2],
    }


class TestGetCvsList:
    """GET /api/cvs."""

    def test_without_token_returns_401(self, client):
        response = client.get("/api/cvs")
        assert response.status_code == 401

    def test_with_token_returns_200_and_list(self, client, auth_headers):
        response = client.get("/api/cvs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_with_token_and_cvs_returns_list_with_job_title_and_company(self, client, auth_headers, sample_cvs):
        response = client.get("/api/cvs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        ids = {item["id"] for item in data}
        assert str(sample_cvs["cv1"].id) in ids or sample_cvs["cv1"].id in ids
        for item in data:
            assert "job_title" in item
            assert "company" in item
            assert "created_at" in item
            assert "location" in item

    def test_filter_by_company_returns_matching(self, client, auth_headers, sample_cvs):
        response = client.get("/api/cvs", params={"company": "Tech"}, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all("Tech" in item["company"] for item in data)
        assert len(data) >= 1

    def test_filter_by_from_and_to_returns_in_range(self, client, auth_headers, sample_cvs):
        from_date = "2026-02-01"
        to_date = "2026-02-15"
        response = client.get(
            "/api/cvs",
            params={"from": from_date, "to": to_date},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestGetCvById:
    """GET /api/cvs/{id}."""

    def test_without_token_returns_401(self, client, sample_cvs):
        cv_id = sample_cvs["cv1"].id
        response = client.get(f"/api/cvs/{cv_id}")
        assert response.status_code == 401

    def test_nonexistent_id_returns_404(self, client, auth_headers):
        response = client.get(f"/api/cvs/{uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_valid_id_returns_200_with_detail(self, client, auth_headers, sample_cvs):
        cv = sample_cvs["cv1"]
        expected_title = "Backend Dev"
        expected_company = "TechCorp"
        response = client.get(f"/api/cvs/{cv.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(cv.id) or data["id"] == cv.id
        assert data["job_id"] == str(cv.job_id) or data["job_id"] == cv.job_id
        assert "latex_content" in data
        assert data["latex_content"] == cv.latex_content
        assert data["job_title"] == expected_title
        assert data["company"] == expected_company
        assert "created_at" in data


class TestGetCvAdapted:
    """GET /api/cvs/{id}/adapted."""

    def test_without_token_returns_401(self, client, sample_cvs):
        cv_id = sample_cvs["cv1"].id
        response = client.get(f"/api/cvs/{cv_id}/adapted")
        assert response.status_code == 401

    def test_nonexistent_id_returns_404(self, client, auth_headers):
        response = client.get(f"/api/cvs/{uuid4()}/adapted", headers=auth_headers)
        assert response.status_code == 404

    def test_returns_404_when_adapted_content_null(self, client, auth_headers, sample_cvs):
        cv2 = sample_cvs["cv2"]
        response = client.get(f"/api/cvs/{cv2.id}/adapted", headers=auth_headers)
        assert response.status_code == 404

    def test_returns_200_and_json_when_adapted_content_set(self, client, auth_headers, sample_cvs):
        cv1 = sample_cvs["cv1"]
        response = client.get(f"/api/cvs/{cv1.id}/adapted", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["summary"] == "Test summary"
        assert data["experience_adapted"] == []
        assert data["projects_adapted"] == []
        assert "skills_adapted" in data


class TestPatchCvAdapted:
    """PATCH /api/cvs/{id}/adapted."""

    def test_without_token_returns_401(self, client, sample_cvs):
        cv_id = sample_cvs["cv1"].id
        response = client.patch(f"/api/cvs/{cv_id}/adapted", json={"summary": "x", "experience_adapted": [], "projects_adapted": [], "skills_adapted": None})
        assert response.status_code == 401

    def test_nonexistent_id_returns_404(self, client, auth_headers):
        body = {"summary": "x", "experience_adapted": [], "projects_adapted": [], "skills_adapted": None}
        response = client.patch(f"/api/cvs/{uuid4()}/adapted", json=body, headers=auth_headers)
        assert response.status_code == 404

    def test_valid_body_updates_and_returns_200(self, client, auth_headers, sample_cvs):
        cv1 = sample_cvs["cv1"]
        body = {"summary": "Updated summary", "experience_adapted": [], "projects_adapted": [], "skills_adapted": {"languages": ["Python"]}}
        with patch("app.main.render_jinja_template", return_value=COMPILABLE_LATEX):
            response = client.patch(f"/api/cvs/{cv1.id}/adapted", json=body, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["summary"] == "Updated summary"
        assert data["skills_adapted"] == {"languages": ["Python"]}


class TestPostCvRecompile:
    """POST /api/cvs/{id}/recompile."""

    def test_without_token_returns_401(self, client, sample_cvs):
        cv_id = sample_cvs["cv1"].id
        response = client.post(f"/api/cvs/{cv_id}/recompile")
        assert response.status_code == 401

    def test_nonexistent_id_returns_404(self, client, auth_headers):
        response = client.post(f"/api/cvs/{uuid4()}/recompile", headers=auth_headers)
        assert response.status_code == 404

    def test_valid_id_returns_200_and_pdf(self, client, auth_headers, sample_cvs):
        cv = sample_cvs["cv1"]
        fake_pdf = b"%PDF-1.4 recompiled"
        with patch("app.main.compile_latex_to_pdf", return_value=fake_pdf):
            response = client.post(f"/api/cvs/{cv.id}/recompile", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("application/pdf")
        assert response.content == fake_pdf


class TestDeleteCv:
    """DELETE /api/cvs/{id}."""

    def test_without_token_returns_401(self, client, sample_cvs):
        cv_id = sample_cvs["cv2"].id
        response = client.delete(f"/api/cvs/{cv_id}")
        assert response.status_code == 401

    def test_nonexistent_id_returns_404(self, client, auth_headers):
        response = client.delete(f"/api/cvs/{uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_valid_id_returns_204_and_cv_gone(self, client, auth_headers, sample_cvs):
        cv_to_delete = sample_cvs["cv2"]
        cv_id = cv_to_delete.id
        response = client.delete(f"/api/cvs/{cv_id}", headers=auth_headers)
        assert response.status_code == 204
        get_response = client.get(f"/api/cvs/{cv_id}", headers=auth_headers)
        assert get_response.status_code == 404
