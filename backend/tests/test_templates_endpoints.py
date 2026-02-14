"""
Tests for Templates CRUD endpoints (Task 6.2). TDD: written before implementation.
GET /api/templates, GET /api/templates/active, PUT /api/templates/{id}, POST /api/templates.
"""
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models.template import Template


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


def _make_template(**overrides):
    defaults = {
        "name": "Test Template",
        "version": 1,
        "content": "\\documentclass{article}\\begin{document}CV\\end{document}",
        "is_active": False,
    }
    defaults.update(overrides)
    return Template(**defaults)


@pytest.fixture
def sample_templates(settings_with_token):
    """Create 2 templates: one active, one inactive."""
    create_db_and_tables()
    with Session(engine) as session:
        t1 = _make_template(name="Active One", is_active=True, content="active content")
        t2 = _make_template(name="Inactive Two", is_active=False, content="inactive content")
        session.add(t1)
        session.add(t2)
        session.commit()
        session.refresh(t1)
        session.refresh(t2)
    return {"active": t1, "inactive": t2, "ids": [t1.id, t2.id]}


@pytest.fixture
def sample_templates_all_inactive(settings_with_token):
    """Create 2 templates, both inactive (for testing GET /active returns 404). Deactivate any existing first."""
    create_db_and_tables()
    with Session(engine) as session:
        existing = session.exec(select(Template)).all()
        for t in existing:
            t.is_active = False
            session.add(t)
        session.commit()
        t1 = _make_template(name="T1", is_active=False)
        t2 = _make_template(name="T2", is_active=False)
        session.add(t1)
        session.add(t2)
        session.commit()
        session.refresh(t1)
        session.refresh(t2)
    return {"t1": t1, "t2": t2}


class TestGetTemplatesList:
    """GET /api/templates."""

    def test_without_token_returns_401(self, client):
        response = client.get("/api/templates")
        assert response.status_code == 401

    def test_with_token_returns_200_and_list(self, client, auth_headers):
        response = client.get("/api/templates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_with_token_and_templates_returns_templates(self, client, auth_headers, sample_templates):
        response = client.get("/api/templates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        ids = {item["id"] for item in data} if data else set()
        for t in sample_templates["ids"]:
            assert str(t) in ids or t in ids


class TestGetTemplateActive:
    """GET /api/templates/active."""

    def test_without_token_returns_401(self, client, sample_templates):
        response = client.get("/api/templates/active")
        assert response.status_code == 401

    def test_no_active_template_returns_404(self, client, auth_headers, sample_templates_all_inactive):
        response = client.get("/api/templates/active", headers=auth_headers)
        assert response.status_code == 404

    def test_with_active_template_returns_200_and_template(self, client, auth_headers, sample_templates):
        response = client.get("/api/templates/active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is True
        assert "content" in data
        assert data["content"] == "active content"


class TestPutTemplate:
    """PUT /api/templates/{id}."""

    def test_without_token_returns_401(self, client, sample_templates):
        t = sample_templates["inactive"]
        response = client.put(f"/api/templates/{t.id}", json={"content": "new"})
        assert response.status_code == 401

    def test_nonexistent_id_returns_404(self, client, auth_headers):
        response = client.put(f"/api/templates/{uuid4()}", json={"content": "x"}, headers=auth_headers)
        assert response.status_code == 404

    def test_valid_body_updates_content_and_updated_at(self, client, auth_headers, sample_templates):
        t = sample_templates["inactive"]
        new_content = "\\documentclass{article}\\begin{document}Updated\\end{document}"
        response = client.put(
            f"/api/templates/{t.id}",
            json={"content": new_content},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == new_content
        assert "updated_at" in data


class TestPostTemplate:
    """POST /api/templates."""

    def test_without_token_returns_401(self, client):
        response = client.post("/api/templates", json={"content": "LaTeX", "name": "Test"})
        assert response.status_code == 401

    def test_creates_template_returns_201(self, client, auth_headers, sample_templates):
        response = client.post(
            "/api/templates",
            json={"content": "\\documentclass{article}\\end{document}", "name": "New Version"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Version"
        assert data["content"] == "\\documentclass{article}\\end{document}"
        assert "version" in data
        assert data["version"] >= 1

    def test_post_with_is_active_true_sets_new_as_active(self, client, auth_headers, sample_templates):
        active_id = str(sample_templates["active"].id)
        response = client.post(
            "/api/templates",
            json={"content": "New active content", "name": "New Active", "is_active": True},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["is_active"] is True
        assert data["content"] == "New active content"
        get_active = client.get("/api/templates/active", headers=auth_headers)
        assert get_active.status_code == 200
        assert get_active.json()["id"] == data["id"]
        list_resp = client.get("/api/templates", headers=auth_headers)
        assert list_resp.status_code == 200
        templates = list_resp.json()
        old = next((t for t in templates if t["id"] == active_id), None)
        assert old is not None
        assert old["is_active"] is False
