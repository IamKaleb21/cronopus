"""
Tests for Template seed (Task 6.5.3). TDD: Docker seeds support.
"""
import os
import pytest
from pathlib import Path
from sqlmodel import Session, select
from unittest.mock import patch

from app.database import engine, create_db_and_tables
from app.models.template import Template

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TEMPLATE_TEX_PATH = PROJECT_ROOT / "docs" / "cv_master_jinja.tex"

# Minimal .tex content for env-var tests (unique marker to verify source)
TEMPLATE_TEX_ENV_TEST = r"\documentclass{article}\begin{document}% ENV_TEMPLATE_TEST\end{document}"


class TestSeedTemplateEnvVar:
    """run_seed uses TEMPLATE_TEX_PATH env var when set. Docker seeds support."""

    def test_run_seed_uses_TEMPLATE_TEX_PATH_when_set(self, tmp_path):
        """When TEMPLATE_TEX_PATH is set, run_seed reads from that path."""
        from app.services.seed_template import run_seed

        tmp_tex = tmp_path / "cv.tex"
        tmp_tex.write_text(TEMPLATE_TEX_ENV_TEST, encoding="utf-8")

        create_db_and_tables()
        with Session(engine) as session:
            for t in session.exec(select(Template)).all():
                session.delete(t)
            session.commit()

        with patch.dict(os.environ, {"TEMPLATE_TEX_PATH": str(tmp_tex)}, clear=False):
            run_seed()

        with Session(engine) as session:
            templates = session.exec(select(Template)).all()
            assert len(templates) >= 1
            active = next((t for t in templates if t.is_active), None)
            assert active is not None
            assert "ENV_TEMPLATE_TEST" in active.content

    def test_run_seed_uses_default_path_when_TEMPLATE_TEX_PATH_unset(self):
        """When TEMPLATE_TEX_PATH is unset, run_seed uses project_root/docs/cv_master_jinja.tex."""
        from app.services.seed_template import run_seed

        create_db_and_tables()
        with Session(engine) as session:
            for t in session.exec(select(Template)).all():
                session.delete(t)
            session.commit()

        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("TEMPLATE_TEX_PATH", None)
            run_seed(tex_path=None)

        with Session(engine) as session:
            templates = session.exec(select(Template)).all()
            assert len(templates) >= 1
            active = next((t for t in templates if t.is_active), None)
            assert active is not None
            assert "documentclass" in active.content
