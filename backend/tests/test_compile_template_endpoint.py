"""
Tests for POST /api/compile-template endpoint (Task 6.5.3). TDD.
"""
from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models.profile import Profile
from app.services.seed_profile import run_seed

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROFILE_JSON_PATH = PROJECT_ROOT / "docs" / "profile.json"


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


SIMPLE_JINJA_TEMPLATE = r"""
\documentclass{article}
\begin{document}
{{ profile.full_name }}
\end{document}
"""


class TestCompileTemplateEndpoint:
    """POST /api/compile-template."""

    def test_compile_template_without_auth_returns_401(self, client):
        """POST /api/compile-template without token returns 401."""
        response = client.post("/api/compile-template", json={"content": SIMPLE_JINJA_TEMPLATE})
        assert response.status_code == 401

    def test_compile_template_with_content_returns_pdf(self, client, auth_headers, settings_with_token):
        """POST with content (LaTeX+Jinja), auth, returns 200 and application/pdf."""
        create_db_and_tables()
        run_seed(json_path=PROFILE_JSON_PATH)

        with patch("app.main.compile_latex_to_pdf", return_value=b"%PDF-1.4 fake"):
            response = client.post(
                "/api/compile-template",
                json={"content": SIMPLE_JINJA_TEMPLATE},
                headers=auth_headers,
            )
        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("application/pdf")
        assert len(response.content) > 0
        assert response.content.startswith(b"%PDF")

    def test_compile_template_uses_profile_from_db(self, client, auth_headers):
        """PDF (or latex passed to compile) contains full_name from Profile in DB."""
        create_db_and_tables()
        run_seed(json_path=PROFILE_JSON_PATH)

        with patch("app.main.compile_latex_to_pdf") as mock_compile:
            mock_compile.return_value = b"%PDF-1.4 fake"
            response = client.post(
                "/api/compile-template",
                json={"content": SIMPLE_JINJA_TEMPLATE},
                headers=auth_headers,
            )
            assert response.status_code == 200
            mock_compile.assert_called_once()
            latex_passed = mock_compile.call_args[0][0]
            assert "Aarón Kaleb Arteaga Rodríguez" in latex_passed

    def test_compile_template_no_profile_returns_503(self, client, auth_headers):
        """If no Profile in DB, returns 503."""
        create_db_and_tables()
        with Session(engine) as session:
            for p in session.exec(select(Profile)).all():
                session.delete(p)
            session.commit()

        response = client.post(
            "/api/compile-template",
            json={"content": SIMPLE_JINJA_TEMPLATE},
            headers=auth_headers,
        )
        assert response.status_code == 503
