"""
Tests for generate_cv_service (Task 6.5.5). TDD: new flow Job+Profile+Template -> Gemini JSON -> Render Jinja -> Compile.
"""
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import MagicMock, patch

import pytest
from sqlmodel import Session

from app.services.latex_compiler import CompilationError

# Minimal profile data valid for ProfileData
PROFILE_DATA_MINIMAL = {
    "full_name": "Test User",
    "title": "Developer",
    "contact": {"phone": "+51", "email": "t@t.com", "location": "Lima", "links": {}},
    "summary": "Summary",
    "skills": {},
    "experience": [
        {"id": "exp-1", "role": "Dev", "company": "Co", "location": "Lima", "from": "2024", "to": "2025", "bullets": ["b1"]},
    ],
    "projects": [
        {"id": "proj-1", "name": "P1", "stack": ["Python"], "from": "2024", "to": "2025", "bullets": ["p1"]},
    ],
    "education": [],
    "certifications": [],
}


def _make_session_with_job_template_profile(job, template, profile):
    """Session that returns job, template, profile for get/exec."""
    session = MagicMock(spec=Session)

    def get(model, pk):
        if model.__name__ == "Job" and pk == job.id:
            return job
        if model.__name__ == "Template" and pk == template.id:
            return template
        return None

    session.get = get
    # When template_id is provided, only exec(select(Profile)).first() is called
    session.exec.return_value.first.return_value = profile
    return session


class TestGenerateCvForJobNewFlow:
    """generate_cv_for_job: Job+Profile+Template -> Gemini JSON -> Render -> Compile. Task 6.5.5."""

    def test_success_calls_gemini_json_and_render_jinja(self):
        from app.services.generate_cv_service import generate_cv_for_job

        job = MagicMock()
        job.id = uuid4()
        job.description = "Backend Python"
        job.title = "Title"
        job.company = "Co"
        template = MagicMock()
        template.id = uuid4()
        template.content = r"\documentclass{article}\begin{document}{{ profile.full_name }}\end{document}"
        profile = SimpleNamespace(data=PROFILE_DATA_MINIMAL)
        session = _make_session_with_job_template_profile(job, template, profile)

        with patch("app.services.generate_cv_service.GeminiService") as MockGemini:
            with patch("app.services.generate_cv_service.render_jinja_template", create=True) as mock_render:
                with patch("app.services.generate_cv_service.compile_latex_to_pdf", return_value=b"%PDF-1.4"):
                    from app.schemas.adapted_content import AdaptedContent
                    mock_gemini = MockGemini.return_value
                    mock_gemini.generate_adapted_content_json.return_value = AdaptedContent(summary="Adapted")
                    mock_render.return_value = r"\documentclass{article}\begin{document}Test User\end{document}"

                    pdf_bytes, generated_cv, out_job = generate_cv_for_job(
                        session, job.id, template.id, api_key="key"
                    )
                    assert pdf_bytes == b"%PDF-1.4"
                    mock_gemini.generate_adapted_content_json.assert_called_once()
                    call_args = mock_gemini.generate_adapted_content_json.call_args
                    assert call_args[0][0] == "Backend Python"
                    mock_render.assert_called_once()
                    assert not hasattr(mock_gemini, "generate_cv_latex") or not mock_gemini.generate_cv_latex.called

    def test_raises_not_found_job(self):
        from app.services.generate_cv_service import generate_cv_for_job, NotFoundError

        job = MagicMock()
        job.id = uuid4()
        template = MagicMock()
        template.id = uuid4()
        profile = SimpleNamespace(data=PROFILE_DATA_MINIMAL)
        session = MagicMock(spec=Session)
        session.get = lambda m, pk: None
        session.exec.return_value.first.return_value = profile

        with pytest.raises(NotFoundError) as exc_info:
            generate_cv_for_job(session, job.id, template.id, api_key="key")
        assert exc_info.value.resource == "job"

    def test_raises_not_found_template(self):
        from app.services.generate_cv_service import generate_cv_for_job, NotFoundError

        job = MagicMock()
        job.id = uuid4()
        job.description = "J"
        template = MagicMock()
        template.id = uuid4()
        profile = SimpleNamespace(data=PROFILE_DATA_MINIMAL)
        session = MagicMock(spec=Session)

        def get(model, pk):
            if model.__name__ == "Job" and pk == job.id:
                return job
            return None

        session.get = get
        # When template_id is None, exec(select(Template)...).first() is called -> None
        session.exec.return_value.first.return_value = None

        with pytest.raises(NotFoundError) as exc_info:
            generate_cv_for_job(session, job.id, None, api_key="key")
        assert exc_info.value.resource == "template"

    def test_raises_not_found_profile(self):
        from app.services.generate_cv_service import generate_cv_for_job, NotFoundError

        job = MagicMock()
        job.id = uuid4()
        job.description = "J"
        template = MagicMock()
        template.id = uuid4()
        template.content = "C"
        session = MagicMock(spec=Session)

        def get(model, pk):
            if model.__name__ == "Job" and pk == job.id:
                return job
            if model.__name__ == "Template" and pk == template.id:
                return template
            return None

        session.get = get
        session.exec.return_value.first.return_value = None  # Profile is None

        with pytest.raises(NotFoundError) as exc_info:
            generate_cv_for_job(session, job.id, template.id, api_key="key")
        assert exc_info.value.resource == "profile"

    def test_gemini_invalid_json_raises(self):
        from app.services.generate_cv_service import generate_cv_for_job

        job = MagicMock()
        job.id = uuid4()
        job.description = "J"
        template = MagicMock()
        template.id = uuid4()
        template.content = "C"
        profile = SimpleNamespace(data=PROFILE_DATA_MINIMAL)
        session = _make_session_with_job_template_profile(job, template, profile)

        with patch("app.services.generate_cv_service.GeminiService") as MockGemini:
            mock_gemini = MockGemini.return_value
            mock_gemini.generate_adapted_content_json.side_effect = ValueError("Gemini response is not valid JSON")

            with pytest.raises(ValueError) as exc_info:
                generate_cv_for_job(session, job.id, template.id, api_key="key")
            assert "JSON" in str(exc_info.value)

    def test_compilation_failure_raises(self):
        from app.services.generate_cv_service import generate_cv_for_job

        job = MagicMock()
        job.id = uuid4()
        job.description = "J"
        template = MagicMock()
        template.id = uuid4()
        template.content = "C"
        profile = SimpleNamespace(data=PROFILE_DATA_MINIMAL)
        session = _make_session_with_job_template_profile(job, template, profile)

        with patch("app.services.generate_cv_service.GeminiService") as MockGemini:
            with patch("app.services.generate_cv_service.render_jinja_template", create=True, return_value=r"\bad"):
                with patch("app.services.generate_cv_service.compile_latex_to_pdf") as mock_compile:
                    from app.schemas.adapted_content import AdaptedContent
                    mock_gemini = MockGemini.return_value
                    mock_gemini.generate_adapted_content_json.return_value = AdaptedContent()
                    mock_compile.side_effect = CompilationError("! Undefined control sequence.")

                    with pytest.raises(CompilationError) as exc_info:
                        generate_cv_for_job(session, job.id, template.id, api_key="key")
                    assert "Undefined control sequence" in str(exc_info.value)
                    mock_compile.assert_called_once()

    def test_saves_generated_cv_with_rendered_latex(self):
        from app.services.generate_cv_service import generate_cv_for_job

        job = MagicMock()
        job.id = uuid4()
        job.description = "J"
        job.title = "T"
        job.company = "C"
        template = MagicMock()
        template.id = uuid4()
        template.content = "C"
        profile = SimpleNamespace(data=PROFILE_DATA_MINIMAL)
        session = _make_session_with_job_template_profile(job, template, profile)
        session.add = MagicMock()
        session.commit = MagicMock()
        session.refresh = MagicMock()

        rendered_latex = r"\documentclass{article}\begin{document}Rendered CV\end{document}"

        with patch("app.services.generate_cv_service.GeminiService") as MockGemini:
            with patch("app.services.generate_cv_service.render_jinja_template", create=True, return_value=rendered_latex):
                with patch("app.services.generate_cv_service.compile_latex_to_pdf", return_value=b"%PDF"):
                    from app.schemas.adapted_content import AdaptedContent
                    mock_gemini = MockGemini.return_value
                    mock_gemini.generate_adapted_content_json.return_value = AdaptedContent()

                    pdf_bytes, generated_cv, _ = generate_cv_for_job(
                        session, job.id, template.id, api_key="key"
                    )
                    assert generated_cv.latex_content == rendered_latex
                    assert generated_cv.job_id == job.id
                    assert generated_cv.template_id == template.id
