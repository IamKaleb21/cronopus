"""
Tests for auth endpoints (Task 4.7 / 6.4).
TDD: these tests validate POST /api/auth/login and GET /api/auth/verify.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


@pytest.fixture
def settings_with_dev_password(monkeypatch):
    """Settings that accept password 'dev' and return token 'test-token'."""
    class MockSettings:
        effective_master_password = lambda self: "dev"
        auth_token = "test-token"
    from app import main as main_module
    monkeypatch.setattr(main_module, "settings", MockSettings())
    return MockSettings


@pytest.fixture
def settings_no_password(monkeypatch):
    """Settings with no master password (e.g. production without MASTER_PASSWORD)."""
    class MockSettings:
        effective_master_password = lambda self: ""
        auth_token = "test-token"
    from app import main as main_module
    monkeypatch.setattr(main_module, "settings", MockSettings())
    return MockSettings


class TestAuthLogin:
    """POST /api/auth/login."""

    def test_login_success_returns_token(self, client, settings_with_dev_password):
        response = client.post("/api/auth/login", json={"password": "dev"})
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["token"] == "test-token"

    def test_login_wrong_password_returns_401(self, client, settings_with_dev_password):
        response = client.post("/api/auth/login", json={"password": "wrong"})
        assert response.status_code == 401
        assert "Contraseña incorrecta" in response.json().get("detail", "")

    def test_login_no_password_configured_returns_503(self, client, settings_no_password):
        response = client.post("/api/auth/login", json={"password": "anything"})
        assert response.status_code == 503
        assert "MASTER_PASSWORD" in response.json().get("detail", "")


class TestAuthVerify:
    """GET /api/auth/verify."""

    def test_verify_valid_token_returns_200(self, client, settings_with_dev_password):
        response = client.get(
            "/api/auth/verify",
            headers={"Authorization": "Bearer test-token"},
        )
        assert response.status_code == 200
        assert response.json() == {"valid": True}

    def test_verify_missing_token_returns_401(self, client, settings_with_dev_password):
        response = client.get("/api/auth/verify")
        assert response.status_code == 401

    def test_verify_invalid_token_returns_401(self, client, settings_with_dev_password):
        response = client.get(
            "/api/auth/verify",
            headers={"Authorization": "Bearer wrong-token"},
        )
        assert response.status_code == 401
