"""
Tests for POST /api/compile (Task 5.3). TDD: mock compiler service, no Tectonic in CI.
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


class TestCompileEndpoint:
    """POST /api/compile returns PDF or 422 with error log."""

    def test_returns_200_and_pdf_when_compilation_succeeds(self, client):
        fake_pdf = b"%PDF-1.4 fake"
        with patch("app.main.compile_latex_to_pdf", return_value=fake_pdf):
            response = client.post(
                "/api/compile",
                json={"content": r"\documentclass{article}\n\begin{document}Hi\n\end{document}"},
            )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.content == fake_pdf

    def test_returns_422_with_detail_when_compilation_fails(self, client):
        from app.services.latex_compiler import CompilationError

        with patch("app.main.compile_latex_to_pdf", side_effect=CompilationError("! LaTeX Error: undefined control sequence.")):
            response = client.post(
                "/api/compile",
                json={"content": r"\documentclass{article}\n\begin{document}\invalid\n\end{document}"},
            )
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
        assert "undefined control sequence" in data["detail"]
