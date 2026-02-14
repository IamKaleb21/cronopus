"""
Tests for POST /api/generate-cv (Task 5.4). TDD: mock service layer.
"""
from uuid import uuid4
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


@pytest.fixture
def valid_job_id():
    return str(uuid4())


@pytest.fixture
def valid_template_id():
    return str(uuid4())


class TestGenerateCvEndpoint:
    """POST /api/generate-cv returns PDF + metadata or appropriate errors."""

    def test_returns_200_pdf_and_metadata_headers_on_success(self, client, valid_job_id, valid_template_id):
        fake_pdf = b"%PDF-1.4 generated"
        mock_cv = MagicMock()
        mock_cv.id = uuid4()
        mock_job = MagicMock()
        mock_job.title = "Backend Developer"
        mock_job.company = "TechCorp"

        with patch("app.main.generate_cv_for_job", return_value=(fake_pdf, mock_cv, mock_job)):
            response = client.post(
                "/api/generate-cv",
                json={"job_id": valid_job_id, "template_id": valid_template_id},
            )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.content == fake_pdf
        assert "x-generated-cv-id" in [h.lower() for h in response.headers]
        assert response.headers.get("x-job-title") == "Backend Developer"
        assert response.headers.get("x-company") == "TechCorp"

    def test_returns_200_using_active_template_when_no_template_id(self, client, valid_job_id):
        fake_pdf = b"%PDF-1.4"
        mock_cv = MagicMock()
        mock_cv.id = uuid4()
        mock_job = MagicMock()
        mock_job.title = "Dev"
        mock_job.company = "Co"

        with patch("app.main.generate_cv_for_job", return_value=(fake_pdf, mock_cv, mock_job)):
            response = client.post("/api/generate-cv", json={"job_id": valid_job_id})
        assert response.status_code == 200
        assert response.content == fake_pdf

    def test_returns_404_when_job_not_found(self, client, valid_template_id):
        from app.services.generate_cv_service import NotFoundError

        with patch("app.main.generate_cv_for_job", side_effect=NotFoundError("job")):
            response = client.post(
                "/api/generate-cv",
                json={"job_id": str(uuid4()), "template_id": valid_template_id},
            )
        assert response.status_code == 404
        assert "detail" in response.json()

    def test_returns_404_when_template_not_found(self, client, valid_job_id):
        from app.services.generate_cv_service import NotFoundError

        with patch("app.main.generate_cv_for_job", side_effect=NotFoundError("template")):
            response = client.post(
                "/api/generate-cv",
                json={"job_id": valid_job_id, "template_id": str(uuid4())},
            )
        assert response.status_code == 404

    def test_returns_422_when_compilation_fails(self, client, valid_job_id, valid_template_id):
        from app.services.latex_compiler import CompilationError

        with patch("app.main.generate_cv_for_job", side_effect=CompilationError("! LaTeX Error: undefined.")):
            response = client.post(
                "/api/generate-cv",
                json={"job_id": valid_job_id, "template_id": valid_template_id},
            )
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
        assert "undefined" in data["detail"]

    def test_returns_503_when_profile_not_configured(self, client, valid_job_id, valid_template_id):
        from app.services.generate_cv_service import NotFoundError

        with patch("app.main.generate_cv_for_job", side_effect=NotFoundError("profile")):
            response = client.post(
                "/api/generate-cv",
                json={"job_id": valid_job_id, "template_id": valid_template_id},
            )
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert "Profile no configurado" in data["detail"]

    def test_returns_422_when_gemini_invalid_json(self, client, valid_job_id, valid_template_id):
        with patch(
            "app.main.generate_cv_for_job",
            side_effect=ValueError("Gemini response is not valid JSON"),
        ):
            response = client.post(
                "/api/generate-cv",
                json={"job_id": valid_job_id, "template_id": valid_template_id},
            )
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
        assert "JSON" in data["detail"]
