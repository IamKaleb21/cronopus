"""
Tests for AdaptedContent schema (Task 6.5.4). TDD.
"""
import pytest
from pydantic import ValidationError


class TestAdaptedContentImportable:
    """AdaptedContent, ExperienceAdapted, ProjectAdapted are importable."""

    def test_adapted_content_importable(self):
        from app.schemas.adapted_content import (
            AdaptedContent,
            ExperienceAdapted,
            ProjectAdapted,
        )

        assert AdaptedContent is not None
        assert ExperienceAdapted is not None
        assert ProjectAdapted is not None


class TestAdaptedContentParse:
    """Parse full and partial JSON into AdaptedContent."""

    def test_adapted_content_parse_full(self):
        """Parse full JSON with summary, experience_adapted, projects_adapted, skills_adapted."""
        from app.schemas.adapted_content import AdaptedContent

        data = {
            "summary": "Resumen adaptado",
            "experience_adapted": [
                {"experience_id": "exp-1", "bullets": ["b1", "b2"]},
            ],
            "projects_adapted": [
                {"project_id": "proj-1", "bullets": ["p1"]},
            ],
            "skills_adapted": {
                "languages": ["PHP", "Python"],
                "frontend": ["React"],
            },
        }
        ac = AdaptedContent.model_validate(data)
        assert ac.summary == "Resumen adaptado"
        assert len(ac.experience_adapted) == 1
        assert ac.experience_adapted[0].experience_id == "exp-1"
        assert ac.experience_adapted[0].bullets == ["b1", "b2"]
        assert len(ac.projects_adapted) == 1
        assert ac.projects_adapted[0].project_id == "proj-1"
        assert ac.projects_adapted[0].bullets == ["p1"]
        assert ac.skills_adapted is not None
        assert ac.skills_adapted["languages"] == ["PHP", "Python"]
        assert ac.skills_adapted["frontend"] == ["React"]

    def test_adapted_content_defaults(self):
        """Empty dict produces defaults: summary='', experience_adapted=[], projects_adapted=[], skills_adapted=None."""
        from app.schemas.adapted_content import AdaptedContent

        ac = AdaptedContent.model_validate({})
        assert ac.summary == ""
        assert ac.experience_adapted == []
        assert ac.projects_adapted == []
        assert ac.skills_adapted is None


class TestExperienceAdaptedStructure:
    """ExperienceAdapted requires experience_id and bullets list."""

    def test_experience_adapted_structure(self):
        """ExperienceAdapted requires experience_id and bullets."""
        from app.schemas.adapted_content import ExperienceAdapted

        ea = ExperienceAdapted.model_validate(
            {"experience_id": "exp-biofmat", "bullets": ["bullet 1", "bullet 2"]}
        )
        assert ea.experience_id == "exp-biofmat"
        assert ea.bullets == ["bullet 1", "bullet 2"]

    def test_experience_adapted_missing_experience_id_raises(self):
        """Missing experience_id raises ValidationError."""
        from app.schemas.adapted_content import ExperienceAdapted

        with pytest.raises(ValidationError):
            ExperienceAdapted.model_validate({"bullets": ["b1"]})


class TestProjectAdaptedStructure:
    """ProjectAdapted requires project_id and bullets list."""

    def test_projects_adapted_structure(self):
        """ProjectAdapted requires project_id and bullets."""
        from app.schemas.adapted_content import ProjectAdapted

        pa = ProjectAdapted.model_validate(
            {"project_id": "proj-cronopus", "bullets": ["p1"]}
        )
        assert pa.project_id == "proj-cronopus"
        assert pa.bullets == ["p1"]

    def test_project_adapted_missing_project_id_raises(self):
        """Missing project_id raises ValidationError."""
        from app.schemas.adapted_content import ProjectAdapted

        with pytest.raises(ValidationError):
            ProjectAdapted.model_validate({"bullets": ["p1"]})


class TestSkillsAdapted:
    """skills_adapted accepts dict with category keys."""

    def test_skills_adapted_keys(self):
        """skills_adapted accepts dict with category keys (languages, frontend, etc)."""
        from app.schemas.adapted_content import AdaptedContent

        data = {
            "skills_adapted": {
                "languages": ["Python", "PHP"],
                "backend_db": ["FastAPI", "Laravel"],
            }
        }
        ac = AdaptedContent.model_validate(data)
        assert ac.skills_adapted is not None
        assert "languages" in ac.skills_adapted
        assert "backend_db" in ac.skills_adapted


class TestAdaptedContentValidation:
    """Invalid types raise ValidationError."""

    def test_adapted_content_invalid_types_raises(self):
        """experience_adapted as str raises ValidationError."""
        from app.schemas.adapted_content import AdaptedContent

        with pytest.raises(ValidationError):
            AdaptedContent.model_validate(
                {"experience_adapted": "not a list"}
            )
