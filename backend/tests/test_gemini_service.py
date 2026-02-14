"""
Tests for GeminiService (Task 5.1). TDD: validate generate_cv_latex behavior with mocked API.
"""
import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture
def mock_genai_client():
    """Mock genai.Client and generate_content to avoid real API calls."""
    with patch("app.services.gemini_service.genai.Client") as mock_client_cls:
        mock_response = MagicMock()
        mock_response.text = "\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}"
        mock_instance = MagicMock()
        mock_instance.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_instance
        yield mock_client_cls, mock_instance


class TestGeminiServiceGenerateCvLatex:
    """generate_cv_latex returns LaTeX string."""

    def test_returns_latex_string(self, mock_genai_client):
        from app.services.gemini_service import GeminiService
        mock_client_cls, mock_instance = mock_genai_client
        service = GeminiService(api_key="test-key")
        result = service.generate_cv_latex(
            job_description="Backend developer",
            master_cv_content="\\documentclass{article}\\begin{document}CV\\end{document}",
        )
        assert isinstance(result, str)
        assert "\\documentclass" in result
        assert len(result) > 0

    def test_strips_markdown_code_block(self, mock_genai_client):
        from app.services.gemini_service import GeminiService
        mock_client_cls, mock_instance = mock_genai_client
        mock_instance.models.generate_content.return_value.text = (
            "```latex\n\\documentclass{article}\n\\begin{document}\nX\n\\end{document}\n```"
        )
        service = GeminiService(api_key="test-key")
        result = service.generate_cv_latex(
            job_description="Job",
            master_cv_content="\\documentclass{article}\\end{document}",
        )
        assert not result.strip().startswith("```")
        assert "\\documentclass" in result
        assert "\\end{document}" in result

    def test_raises_when_api_key_empty(self):
        from app.services.gemini_service import GeminiService
        with pytest.raises(ValueError, match="gemini_api_key|GEMINI_API_KEY|no configurado"):
            GeminiService(api_key="").generate_cv_latex(
                job_description="Job",
                master_cv_content="CV",
            )

    def test_injects_prompt(self, mock_genai_client):
        from app.services.gemini_service import GeminiService
        mock_client_cls, mock_instance = mock_genai_client
        service = GeminiService(api_key="test-key")
        job_desc = "Python backend developer at X"
        master_cv = "\\documentclass{article}\\begin{document}Me\\end{document}"
        service.generate_cv_latex(job_description=job_desc, master_cv_content=master_cv)
        call_args = mock_instance.models.generate_content.call_args
        assert call_args is not None
        contents = call_args.kwargs.get("contents") or (call_args.args[1] if len(call_args.args) > 1 else None)
        if contents is None and call_args.args:
            contents = call_args.args[0]
        assert job_desc in str(contents)
        assert master_cv in str(contents)


class TestGeminiServiceGenerateCvLatexCorrect:
    """generate_cv_latex_correct (Task 5.5) returns corrected LaTeX with error log in prompt."""

    def test_returns_corrected_latex_string(self, mock_genai_client):
        from app.services.gemini_service import GeminiService
        mock_client_cls, mock_instance = mock_genai_client
        mock_instance.models.generate_content.return_value.text = (
            "\\documentclass{article}\n\\begin{document}\nFixed\n\\end{document}"
        )
        service = GeminiService(api_key="test-key")
        result = service.generate_cv_latex_correct(
            job_description="Job",
            master_cv_content="\\documentclass{article}\\begin{document}CV\\end{document}",
            previous_latex="\\documentclass{article}\\begin{document}Broken\\end{document}",
            compilation_error_log="! Undefined control sequence.",
        )
        assert isinstance(result, str)
        assert "\\documentclass" in result
        assert "Fixed" in result

    def test_injects_error_log_and_previous_latex_in_prompt(self, mock_genai_client):
        from app.services.gemini_service import GeminiService
        mock_client_cls, mock_instance = mock_genai_client
        mock_instance.models.generate_content.return_value.text = "\\documentclass{article}\\end{document}"
        service = GeminiService(api_key="test-key")
        prev = "\\begin{document}bad"
        log = "! LaTeX Error: undefined."
        service.generate_cv_latex_correct(
            job_description="J",
            master_cv_content="C",
            previous_latex=prev,
            compilation_error_log=log,
        )
        call_args = mock_instance.models.generate_content.call_args
        assert call_args is not None
        contents = call_args.kwargs.get("contents") or (call_args.args[1] if len(call_args.args) > 1 else None)
        if contents is None and call_args.args:
            contents = call_args.args[0]
        contents_str = str(contents or "")
        assert log in contents_str
        assert prev in contents_str


class TestGeminiServiceGenerateAdaptedContentJson:
    """generate_adapted_content_json (Task 6.5.4) returns AdaptedContent from JSON."""

    @pytest.fixture
    def minimal_profile(self):
        from app.schemas.profile_data import ProfileData
        return ProfileData.model_validate({
            "full_name": "Test User",
            "title": "Developer",
            "contact": {"phone": "+51", "email": "t@t.com", "location": "Lima", "links": {}},
            "summary": "Full Stack developer with Python and React.",
            "skills": {"languages": ["Python", "PHP"], "frontend": ["React"]},
            "experience": [{"id": "exp-1", "role": "Dev", "company": "X", "location": "Lima", "from": "2024", "to": "2025", "bullets": ["b1"]}],
            "projects": [{"id": "proj-1", "name": "P1", "stack": ["Python"], "from": "2024", "to": "2025", "bullets": ["p1"]}],
            "education": [],
            "certifications": [],
        })

    def test_generate_adapted_content_json_returns_adapted_content(self, mock_genai_client, minimal_profile):
        from app.services.gemini_service import GeminiService
        from app.schemas.adapted_content import AdaptedContent

        valid_json = '{"summary": "Adapted summary", "experience_adapted": [{"experience_id": "exp-1", "bullets": ["ab1"]}], "projects_adapted": [{"project_id": "proj-1", "bullets": ["ap1"]}], "skills_adapted": {"languages": ["Python", "PHP"]}}'
        mock_genai_client[1].models.generate_content.return_value.text = valid_json

        service = GeminiService(api_key="test-key")
        result = service.generate_adapted_content_json(
            job_description="Backend Python",
            profile=minimal_profile,
        )
        assert isinstance(result, AdaptedContent)
        assert result.summary == "Adapted summary"
        assert len(result.experience_adapted) == 1
        assert result.experience_adapted[0].experience_id == "exp-1"
        assert result.experience_adapted[0].bullets == ["ab1"]
        assert len(result.projects_adapted) == 1
        assert result.projects_adapted[0].project_id == "proj-1"
        assert result.skills_adapted is not None
        assert result.skills_adapted["languages"] == ["Python", "PHP"]

    def test_generate_adapted_content_json_strips_markdown(self, mock_genai_client, minimal_profile):
        from app.services.gemini_service import GeminiService
        from app.schemas.adapted_content import AdaptedContent

        valid_json = '{"summary": "S", "experience_adapted": [], "projects_adapted": [], "skills_adapted": null}'
        wrapped = "```json\n" + valid_json + "\n```"
        mock_genai_client[1].models.generate_content.return_value.text = wrapped

        service = GeminiService(api_key="test-key")
        result = service.generate_adapted_content_json(
            job_description="Job",
            profile=minimal_profile,
        )
        assert isinstance(result, AdaptedContent)
        assert result.summary == "S"

    def test_generate_adapted_content_json_invalid_json_raises(self, mock_genai_client, minimal_profile):
        from app.services.gemini_service import GeminiService

        mock_genai_client[1].models.generate_content.return_value.text = "not valid json {"
        service = GeminiService(api_key="test-key")
        with pytest.raises((ValueError, Exception)) as exc_info:
            service.generate_adapted_content_json(
                job_description="Job",
                profile=minimal_profile,
            )
        assert "json" in str(exc_info.value).lower() or "parse" in str(exc_info.value).lower() or "validation" in str(exc_info.value).lower()

    def test_generate_adapted_content_json_injects_context(self, mock_genai_client, minimal_profile):
        from app.services.gemini_service import GeminiService

        valid_json = '{"summary": "", "experience_adapted": [], "projects_adapted": [], "skills_adapted": null}'
        mock_genai_client[1].models.generate_content.return_value.text = valid_json

        service = GeminiService(api_key="test-key")
        service.generate_adapted_content_json(
            job_description="Backend Python with FastAPI",
            profile=minimal_profile,
        )
        call_args = mock_genai_client[1].models.generate_content.call_args
        assert call_args is not None
        contents = call_args.kwargs.get("contents", call_args.args[0] if call_args.args else None)
        contents_str = str(contents)
        assert "Backend Python with FastAPI" in contents_str
        assert minimal_profile.summary in contents_str
        assert "exp-1" in contents_str
        assert "proj-1" in contents_str

    def test_generate_adapted_content_json_uses_low_temperature(self, mock_genai_client, minimal_profile):
        from app.services.gemini_service import GeminiService

        valid_json = '{"summary": "", "experience_adapted": [], "projects_adapted": [], "skills_adapted": null}'
        mock_genai_client[1].models.generate_content.return_value.text = valid_json

        service = GeminiService(api_key="test-key")
        service.generate_adapted_content_json(job_description="J", profile=minimal_profile)

        call_args = mock_genai_client[1].models.generate_content.call_args
        config = call_args.kwargs.get("config")
        assert config is not None
        assert config.temperature == 0.1

    def test_generate_adapted_content_json_empty_api_key_raises(self, minimal_profile):
        from app.services.gemini_service import GeminiService

        with pytest.raises(ValueError, match="gemini_api_key|GEMINI_API_KEY|no configurado"):
            GeminiService(api_key="").generate_adapted_content_json(
                job_description="Job",
                profile=minimal_profile,
            )
