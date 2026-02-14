"""
Tests for Jinja template rendering (Task 6.5.3). TDD.
"""
import json
import shutil
import pytest
from pathlib import Path

from app.schemas.profile_data import ProfileData

TECTONIC_AVAILABLE = shutil.which("tectonic") is not None
from app.schemas.adapted_content import AdaptedContent

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _extract_uri_links_from_pdf(pdf_bytes: bytes) -> list:
    """Extract all /URI link targets from a PDF (for testing clickable links)."""
    from io import BytesIO

    from pypdf import PdfReader

    reader = PdfReader(BytesIO(pdf_bytes))
    uris = []
    for page in reader.pages:
        if "/Annots" not in page:
            continue
        for annot in page["/Annots"]:
            obj = annot.get_object()
            if obj.get("/Subtype") != "/Link" or "/A" not in obj:
                continue
            a = obj["/A"]
            if "/URI" in a:
                uri = a["/URI"]
                if hasattr(uri, "get_object"):
                    uri = uri.get_object()
                uris.append(uri.decode("utf-8", errors="replace") if isinstance(uri, bytes) else str(uri))
    return uris


CV_MASTER_JINJA_PATH = PROJECT_ROOT / "docs" / "cv_master_jinja.tex"
PROFILE_JSON_PATH = PROJECT_ROOT / "docs" / "profile.json"

# Minimal ProfileData for tests
MINIMAL_PROFILE = ProfileData.model_validate({
    "full_name": "Test User",
    "title": "Developer",
    "contact": {"phone": "+51", "email": "t@t.com", "location": "Lima", "links": {}},
    "summary": "Summary",
    "skills": {},
    "experience": [],
    "projects": [],
    "education": [],
    "certifications": [],
})

# Minimal compilable LaTeX + Jinja template
SIMPLE_TEMPLATE = r"""
\documentclass{article}
\begin{document}
{{ profile.full_name }}
\end{document}
"""


class TestJinjaRender:
    """Tests for render_jinja_template."""

    def test_render_jinja_template_returns_latex(self):
        """render_jinja_template(template_content, profile, adapted) returns LaTeX string containing profile.full_name."""
        from app.services.jinja_renderer import render_jinja_template

        adapted = AdaptedContent()
        result = render_jinja_template(SIMPLE_TEMPLATE, MINIMAL_PROFILE, adapted)
        assert isinstance(result, str)
        assert "Test User" in result
        assert r"\documentclass{article}" in result

    @pytest.mark.skipif(not TECTONIC_AVAILABLE, reason="Tectonic not installed (run in Docker or install tectonic)")
    def test_render_jinja_template_compiles_ok(self):
        """Render + compile_latex_to_pdf(rendered) produces valid PDF bytes."""
        from app.services.jinja_renderer import render_jinja_template
        from app.services.latex_compiler import compile_latex_to_pdf

        adapted = AdaptedContent()
        latex = render_jinja_template(SIMPLE_TEMPLATE, MINIMAL_PROFILE, adapted)
        pdf_bytes = compile_latex_to_pdf(latex)
        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes.startswith(b"%PDF")

    def test_render_with_adapted_overrides_summary(self):
        """If adapted.summary has value, cv.summary contains it and LaTeX shows it."""
        from app.services.jinja_renderer import render_jinja_template

        template = r"""
\documentclass{article}
\begin{document}
{{ cv.summary }}
\end{document}
"""
        adapted = AdaptedContent(summary="Adapted summary for job")
        result = render_jinja_template(template, MINIMAL_PROFILE, adapted)
        assert "Adapted summary for job" in result
        assert "Summary" not in result

    def test_cv_master_jinja_renders_with_full_profile(self):
        """cv_master_jinja.tex renders with full profile; output contains full_name."""
        from app.services.jinja_renderer import render_jinja_template

        template_content = CV_MASTER_JINJA_PATH.read_text(encoding="utf-8")
        profile_data = json.loads(PROFILE_JSON_PATH.read_text(encoding="utf-8"))
        profile = ProfileData.model_validate(profile_data)
        adapted = AdaptedContent()

        result = render_jinja_template(template_content, profile, adapted)

        assert isinstance(result, str)
        assert profile.full_name in result
        assert r"\documentclass" in result

    def test_cv_master_jinja_header_links_no_spaces_in_href(self):
        """Rendered LaTeX has \\url{url} or \\href{url} without spaces so PDF links are clickable."""
        from app.services.jinja_renderer import render_jinja_template

        template_content = CV_MASTER_JINJA_PATH.read_text(encoding="utf-8")
        profile_data = json.loads(PROFILE_JSON_PATH.read_text(encoding="utf-8"))
        profile = ProfileData.model_validate(profile_data)
        adapted = AdaptedContent()

        result = render_jinja_template(template_content, profile, adapted)

        # Space after \href{ or \url{ breaks clickable links in PDF
        assert "\\href{ https://" not in result, "header links must not have space after \\href{"
        assert "\\url{ https://" not in result, "header links must not have space after \\url{"
        # Template uses \url for https links (or \href)
        assert "\\url{https://" in result or "\\href{https://" in result, "header must contain \\url{https:// or \\href{https://"

    @pytest.mark.skipif(not TECTONIC_AVAILABLE, reason="Tectonic not installed (run in Docker or install tectonic)")
    def test_cv_master_jinja_compiles_to_valid_pdf(self):
        """cv_master_jinja.tex render + compile produces valid PDF bytes."""
        from app.services.jinja_renderer import render_jinja_template
        from app.services.latex_compiler import compile_latex_to_pdf

        template_content = CV_MASTER_JINJA_PATH.read_text(encoding="utf-8")
        profile_data = json.loads(PROFILE_JSON_PATH.read_text(encoding="utf-8"))
        profile = ProfileData.model_validate(profile_data)
        adapted = AdaptedContent()

        latex = render_jinja_template(template_content, profile, adapted)
        pdf_bytes = compile_latex_to_pdf(latex)

        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes.startswith(b"%PDF")

    @pytest.mark.skipif(not TECTONIC_AVAILABLE, reason="Tectonic not installed (run in Docker or install tectonic)")
    def test_cv_master_pdf_header_links_are_clickable_uri_annotations(self):
        """Compiled PDF contains URI link annotations for LinkedIn, GitHub, website (https only; mailto is separate)."""
        from app.services.jinja_renderer import render_jinja_template
        from app.services.latex_compiler import compile_latex_to_pdf

        template_content = CV_MASTER_JINJA_PATH.read_text(encoding="utf-8")
        profile_data = json.loads(PROFILE_JSON_PATH.read_text(encoding="utf-8"))
        profile = ProfileData.model_validate(profile_data)
        adapted = AdaptedContent()

        latex = render_jinja_template(template_content, profile, adapted)
        pdf_bytes = compile_latex_to_pdf(latex)

        all_uris = _extract_uri_links_from_pdf(pdf_bytes)
        # Only https links (exclude mailto: which is the email link that already works)
        https_uris = [u for u in all_uris if "https://" in u]
        expected_urls = [
            profile_data["contact"]["links"]["linkedin"],
            profile_data["contact"]["links"]["github"],
            profile_data["contact"]["links"]["website"],
        ]
        assert len(https_uris) >= 3, (
            f"PDF should have at least 3 https URI annotations (LinkedIn, GitHub, website); "
            f"found {len(https_uris)} https URIs. All URIs: {all_uris!r}"
        )
        for expected in expected_urls:
            assert any(
                expected in u for u in https_uris
            ), f"PDF should contain clickable https URI for {expected!r}; https URIs: {https_uris!r}"


# Profile with experience and projects for merge tests
PROFILE_WITH_EXP_PROJ = ProfileData.model_validate({
    "full_name": "Merge Test",
    "title": "Dev",
    "contact": {"phone": "+51", "email": "t@t.com", "location": "Lima", "links": {}},
    "summary": "Profile summary",
    "skills": {
        "languages": ["Python", "PHP"],
        "frontend": ["React"],
        "data_ml": ["Pandas"],
        "languages_spoken": [{"name": "Español", "level": "Nativo"}],
    },
    "experience": [
        {"id": "exp-1", "role": "Dev", "company": "X", "location": "Lima", "from": "2024", "to": "2025", "bullets": ["b1", "b2"]},
        {"id": "exp-2", "role": "Senior", "company": "Y", "location": "Lima", "from": "2023", "to": "2024", "bullets": ["b3"]},
    ],
    "projects": [
        {"id": "proj-1", "name": "P1", "stack": ["Python"], "from": "2024", "to": "2025", "bullets": ["p1"]},
        {"id": "proj-2", "name": "P2", "stack": ["React"], "from": "2023", "to": "2024", "bullets": ["p2", "p3"]},
    ],
    "education": [],
    "certifications": [],
})


class TestMergeProfileWithAdapted:
    """Tests for merge_profile_with_adapted (TDD)."""

    def test_merge_empty_adapted_returns_profile_values(self):
        """When adapted is empty, cv.summary/experience/projects/skills come from profile."""
        from app.services.jinja_renderer import merge_profile_with_adapted

        adapted = AdaptedContent()
        cv = merge_profile_with_adapted(PROFILE_WITH_EXP_PROJ, adapted)
        assert cv["summary"] == "Profile summary"
        assert len(cv["experience"]) == 2
        assert cv["experience"][0]["role"] == "Dev"
        assert cv["experience"][0]["bullets"] == ["b1", "b2"]
        assert len(cv["projects"]) == 2
        assert cv["projects"][0]["name"] == "P1"
        assert cv["skills"]["languages"] == ["Python", "PHP"]

    def test_merge_adapted_summary_overrides(self):
        """When adapted.summary is present, cv.summary = adapted.summary."""
        from app.services.jinja_renderer import merge_profile_with_adapted

        adapted = AdaptedContent(summary="Adapted summary")
        cv = merge_profile_with_adapted(PROFILE_WITH_EXP_PROJ, adapted)
        assert cv["summary"] == "Adapted summary"

    def test_merge_experience_uses_adapted_bullets(self):
        """adapted.experience_adapted provides bullets; metadata comes from profile."""
        from app.services.jinja_renderer import merge_profile_with_adapted

        adapted = AdaptedContent(
            experience_adapted=[{"experience_id": "exp-1", "bullets": ["ab1", "ab2"]}],
        )
        cv = merge_profile_with_adapted(PROFILE_WITH_EXP_PROJ, adapted)
        assert len(cv["experience"]) == 1
        assert cv["experience"][0]["id"] == "exp-1"
        assert cv["experience"][0]["role"] == "Dev"
        assert cv["experience"][0]["company"] == "X"
        assert cv["experience"][0]["bullets"] == ["ab1", "ab2"]

    def test_merge_experience_filters_to_adapted_only(self):
        """Only experience items in experience_adapted appear in cv.experience."""
        from app.services.jinja_renderer import merge_profile_with_adapted

        adapted = AdaptedContent(
            experience_adapted=[{"experience_id": "exp-2", "bullets": ["ab3"]}],
        )
        cv = merge_profile_with_adapted(PROFILE_WITH_EXP_PROJ, adapted)
        assert len(cv["experience"]) == 1
        assert cv["experience"][0]["id"] == "exp-2"
        assert cv["experience"][0]["role"] == "Senior"

    def test_merge_projects_same_logic(self):
        """Projects: adapted bullets + profile metadata; only adapted projects included."""
        from app.services.jinja_renderer import merge_profile_with_adapted

        adapted = AdaptedContent(
            projects_adapted=[{"project_id": "proj-2", "bullets": ["ap2"]}],
        )
        cv = merge_profile_with_adapted(PROFILE_WITH_EXP_PROJ, adapted)
        assert len(cv["projects"]) == 1
        assert cv["projects"][0]["id"] == "proj-2"
        assert cv["projects"][0]["name"] == "P2"
        assert cv["projects"][0]["bullets"] == ["ap2"]

    def test_merge_skills_uses_skills_adapted(self):
        """When skills_adapted is present, cv.skills uses it (filtered categories)."""
        from app.services.jinja_renderer import merge_profile_with_adapted

        adapted = AdaptedContent(skills_adapted={"languages": ["Python"], "backend_db": ["FastAPI"]})
        cv = merge_profile_with_adapted(PROFILE_WITH_EXP_PROJ, adapted)
        assert cv["skills"]["languages"] == ["Python"]
        assert cv["skills"]["backend_db"] == ["FastAPI"]
        assert "data_ml" not in cv["skills"] or cv["skills"].get("data_ml") is None

    def test_merge_skills_includes_languages_spoken_from_profile(self):
        """cv.skills includes languages_spoken from profile (idiomas always visible)."""
        from app.services.jinja_renderer import merge_profile_with_adapted

        adapted = AdaptedContent(skills_adapted={"languages": ["Python"]})
        cv = merge_profile_with_adapted(PROFILE_WITH_EXP_PROJ, adapted)
        assert "languages_spoken" in cv["skills"]
        assert len(cv["skills"]["languages_spoken"]) == 1
        assert cv["skills"]["languages_spoken"][0]["name"] == "Español"
        assert cv["skills"]["languages_spoken"][0]["level"] == "Nativo"


class TestRenderPassesCvContext:
    """Tests for render_jinja_template passing cv context."""

    def test_render_passes_cv_context(self):
        """Template using {{ cv.summary }} receives cv from merge."""
        from app.services.jinja_renderer import render_jinja_template

        template = r"""
\documentclass{article}
\begin{document}
{{ cv.summary }}
\end{document}
"""
        adapted = AdaptedContent(summary="CV summary")
        result = render_jinja_template(template, MINIMAL_PROFILE, adapted)
        assert "CV summary" in result

    def test_render_cv_experience_uses_adapted(self):
        """With experience_adapted, LaTeX contains adapted bullets not originals."""
        from app.services.jinja_renderer import render_jinja_template

        template = r"""
\documentclass{article}
\begin{document}
{% for exp in cv.experience %}{% for b in exp.bullets %}{{ b }}{% endfor %}{% endfor %}
\end{document}
"""
        adapted = AdaptedContent(
            experience_adapted=[{"experience_id": "exp-1", "bullets": ["adapted bullet"]}],
        )
        result = render_jinja_template(template, PROFILE_WITH_EXP_PROJ, adapted)
        assert "adapted bullet" in result
        assert "b1" not in result

    def test_render_cv_skills_filtered(self):
        """With skills_adapted = {languages: [Python]}, LaTeX has Python but not data_ml categories."""
        from app.services.jinja_renderer import render_jinja_template

        template = r"""
\documentclass{article}
\begin{document}
{% if cv.skills.languages %}LANGUAGES: {{ cv.skills.languages | join(', ') }}{% endif %}
{% if cv.skills.data_ml %}DATA_ML: {{ cv.skills.data_ml | join(', ') }}{% endif %}
\end{document}
"""
        adapted = AdaptedContent(skills_adapted={"languages": ["Python"]})
        result = render_jinja_template(template, PROFILE_WITH_EXP_PROJ, adapted)
        assert "LANGUAGES: Python" in result
        assert "DATA_ML:" not in result or "DATA_ML: " in result  # data_ml should be absent/empty

    def test_render_sanitizes_profile_and_cv(self):
        """Profile/cv with special chars (%, _) are sanitized in LaTeX output."""
        from app.services.jinja_renderer import render_jinja_template

        profile_special = ProfileData.model_validate({
            **MINIMAL_PROFILE.model_dump(),
            "summary": "Done 100%",
        })
        adapted = AdaptedContent(summary="Summary 100%", experience_adapted=[{
            "experience_id": "exp-1", "bullets": ["data_ml score"]
        }])
        # Use profile with exp-1
        profile_with_exp = ProfileData.model_validate({
            **MINIMAL_PROFILE.model_dump(),
            "summary": "X",
            "experience": [{"id": "exp-1", "role": "Dev", "company": "X", "location": "Lima", "from": "2024", "to": "2025", "bullets": []}],
        })
        template = r"""
\documentclass{article}
\begin{document}
{{ cv.summary }} | {{ cv.experience[0].bullets[0] }}
\end{document}
"""
        result = render_jinja_template(template, profile_with_exp, adapted)
        assert "100\\%" in result or "100\\\\%" in result  # escaped percent
        assert "data\\_ml" in result or "data\\\\_ml" in result  # escaped underscore
