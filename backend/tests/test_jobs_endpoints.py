"""
Tests for Jobs CRUD endpoints (Task 6.1). TDD: written before implementation.
GET /api/jobs, GET /api/jobs/{id}, PATCH /api/jobs/{id}, DELETE /api/jobs/{id}.
"""
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.database import engine, create_db_and_tables
from app.models.job import Job, JobStatus, JobSource


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


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


@pytest.fixture
def sample_jobs(settings_with_token):
    """Create 3 jobs in DB: two NEW/COMPUTRABAJO, one SAVED/PRACTICAS_PE."""
    create_db_and_tables()
    with Session(engine) as session:
        j1 = _make_job(status=JobStatus.NEW, source=JobSource.COMPUTRABAJO, title="Job A")
        j2 = _make_job(status=JobStatus.SAVED, source=JobSource.PRACTICAS_PE, title="Job B")
        j3 = _make_job(status=JobStatus.NEW, source=JobSource.COMPUTRABAJO, title="Job C")
        session.add(j1)
        session.add(j2)
        session.add(j3)
        session.commit()
        session.refresh(j1)
        session.refresh(j2)
        session.refresh(j3)
    return {
        "job_new_a": j1,
        "job_saved_b": j2,
        "job_new_c": j3,
        "ids": [j1.id, j2.id, j3.id],
    }


class TestGetJobsList:
    """GET /api/jobs."""

    def test_without_token_returns_401(self, client):
        response = client.get("/api/jobs")
        assert response.status_code == 401

    def test_with_token_returns_200_and_list(self, client, auth_headers):
        response = client.get("/api/jobs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_with_token_and_jobs_returns_jobs(self, client, auth_headers, sample_jobs):
        response = client.get("/api/jobs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3
        ids = {item["id"] for item in data}
        for j in sample_jobs["ids"]:
            assert str(j) in ids or j in ids

    def test_filter_by_status_returns_matching(self, client, auth_headers, sample_jobs):
        response = client.get("/api/jobs", params={"status": "NEW"}, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(item["status"] == "NEW" for item in data)
        assert len(data) >= 2

    def test_filter_by_source_returns_matching(self, client, auth_headers, sample_jobs):
        response = client.get("/api/jobs", params={"source": "PRACTICAS_PE"}, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(item["source"] == "PRACTICAS_PE" for item in data)
        assert len(data) >= 1


class TestGetJobById:
    """GET /api/jobs/{id}."""

    def test_without_token_returns_401(self, client, sample_jobs):
        job_id = sample_jobs["job_new_a"].id
        response = client.get(f"/api/jobs/{job_id}")
        assert response.status_code == 401

    def test_nonexistent_id_returns_404(self, client, auth_headers):
        response = client.get(f"/api/jobs/{uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_valid_id_returns_200_and_job(self, client, auth_headers, sample_jobs):
        job = sample_jobs["job_new_a"]
        response = client.get(f"/api/jobs/{job.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(job.id) or data["id"] == job.id
        assert data["title"] == job.title
        assert data["status"] == "NEW"


class TestPatchJob:
    """PATCH /api/jobs/{id}."""

    def test_without_token_returns_401(self, client, sample_jobs):
        job_id = sample_jobs["job_new_a"].id
        response = client.patch(f"/api/jobs/{job_id}", json={"status": "APPLIED"})
        assert response.status_code == 401

    def test_nonexistent_id_returns_404(self, client, auth_headers):
        response = client.patch(f"/api/jobs/{uuid4()}", json={"status": "APPLIED"}, headers=auth_headers)
        assert response.status_code == 404

    def test_apply_status_sets_applied_at(self, client, auth_headers, sample_jobs):
        job = sample_jobs["job_new_a"]
        response = client.patch(
            f"/api/jobs/{job.id}",
            json={"status": "APPLIED"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "APPLIED"
        assert "applied_at" in data
        assert data["applied_at"] is not None

    def test_patch_status_to_expired(self, client, auth_headers, sample_jobs):
        job = sample_jobs["job_saved_b"]
        job_id = str(job.id)
        response = client.patch(
            f"/api/jobs/{job_id}",
            json={"status": "EXPIRED"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "EXPIRED"


class TestDeleteJob:
    """DELETE /api/jobs/{id}."""

    def test_without_token_returns_401(self, client, sample_jobs):
        job_id = sample_jobs["job_new_c"].id
        response = client.delete(f"/api/jobs/{job_id}")
        assert response.status_code == 401

    def test_nonexistent_id_returns_404(self, client, auth_headers):
        response = client.delete(f"/api/jobs/{uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_valid_id_returns_204_and_job_gone(self, client, auth_headers, sample_jobs):
        job_to_delete = sample_jobs["job_new_c"]
        job_id = job_to_delete.id
        response = client.delete(f"/api/jobs/{job_id}", headers=auth_headers)
        assert response.status_code == 204
        get_response = client.get(f"/api/jobs/{job_id}", headers=auth_headers)
        assert get_response.status_code == 404


class TestPostJob:
    """POST /api/jobs - Create manual job. Task 4.8."""

    VALID_BODY = {
        "title": "Manual Backend Dev",
        "company": "MyCompany",
        "location": "Lima, Remoto",
        "description": "Descripción del puesto manual.",
        "url": "https://example.com/apply",
    }

    def test_without_token_returns_401(self, client):
        response = client.post("/api/jobs", json=self.VALID_BODY)
        assert response.status_code == 401

    def test_post_creates_manual_job_returns_201(self, client, auth_headers, settings_with_token):
        create_db_and_tables()
        response = client.post("/api/jobs", json=self.VALID_BODY, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["source"] == "MANUAL"
        assert data["status"] == "SAVED"
        assert data["title"] == self.VALID_BODY["title"]
        assert data["company"] == self.VALID_BODY["company"]
        assert data["external_id"].startswith("manual-")

    def test_post_validates_required_fields(self, client, auth_headers, settings_with_token):
        create_db_and_tables()
        body_no_title = {k: v for k, v in self.VALID_BODY.items() if k != "title"}
        response = client.post("/api/jobs", json=body_no_title, headers=auth_headers)
        assert response.status_code == 422

        body_no_url = {k: v for k, v in self.VALID_BODY.items() if k != "url"}
        response = client.post("/api/jobs", json=body_no_url, headers=auth_headers)
        assert response.status_code == 422

    def test_post_job_appears_in_list(self, client, auth_headers, settings_with_token):
        create_db_and_tables()
        response = client.post("/api/jobs", json=self.VALID_BODY, headers=auth_headers)
        assert response.status_code == 201
        created_id = response.json()["id"]

        list_response = client.get("/api/jobs", headers=auth_headers)
        assert list_response.status_code == 200
        ids = [item["id"] for item in list_response.json()]
        assert created_id in ids or str(created_id) in ids

    def test_filter_by_source_manual(self, client, auth_headers, settings_with_token):
        create_db_and_tables()
        response = client.post("/api/jobs", json=self.VALID_BODY, headers=auth_headers)
        assert response.status_code == 201

        list_response = client.get("/api/jobs", params={"source": "MANUAL"}, headers=auth_headers)
        assert list_response.status_code == 200
        data = list_response.json()
        assert all(item["source"] == "MANUAL" for item in data)
        assert len(data) >= 1
