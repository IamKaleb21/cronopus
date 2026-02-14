"""
Tests for Profile seed (Task 6.5.1). TDD: written before implementation.
Docker seeds: PROFILE_JSON_PATH env var support.
"""
import json
import os
import pytest
from pathlib import Path
from sqlmodel import Session, select
from unittest.mock import patch

from app.database import engine, create_db_and_tables
from app.models.profile import Profile

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROFILE_JSON_PATH = PROJECT_ROOT / "docs" / "profile.json"

# Minimal profile for env-var tests (distinct full_name to verify source)
PROFILE_JSON_ENV_TEST = {
    "full_name": "EnvTestUser",
    "title": "Dev",
    "contact": {"phone": "+51", "email": "e@e.com", "location": "Lima", "links": {}},
    "summary": "Summary",
    "skills": {},
    "experience": [],
    "projects": [],
    "education": [],
    "certifications": [],
}


class TestSeedProfileLoadJson:
    """load_profile_from_json loads and parses docs/profile.json."""

    def test_seed_profile_loads_json(self):
        """load_profile_from_json(path) loads and parses docs/profile.json correctly."""
        from app.services.seed_profile import load_profile_from_json

        data = load_profile_from_json(PROFILE_JSON_PATH)
        assert isinstance(data, dict)
        assert data["full_name"] == "Aarón Kaleb Arteaga Rodríguez"
        assert "contact" in data
        assert "skills" in data
        assert "experience" in data
        assert "projects" in data
        assert "education" in data
        assert "certifications" in data


class TestSeedProfileCreatesRecord:
    """Seed creates exactly one Profile with data from profile.json."""

    def test_seed_profile_creates_record(self):
        """Run seed on empty DB; exactly 1 Profile with data matching profile.json."""
        from app.services.seed_profile import run_seed

        create_db_and_tables()
        # Clear existing profiles for isolated test
        with Session(engine) as session:
            for p in session.exec(select(Profile)).all():
                session.delete(p)
            session.commit()

        run_seed(json_path=PROFILE_JSON_PATH)

        with Session(engine) as session:
            profiles = session.exec(select(Profile)).all()
            assert len(profiles) == 1
            p = profiles[0]
            assert p.data["full_name"] == "Aarón Kaleb Arteaga Rodríguez"
            assert p.data["title"] == "Ingeniero Informático y Desarrollador Full Stack"


class TestSeedProfileIdempotent:
    """Seed is idempotent: run twice does not duplicate records."""

    def test_seed_profile_idempotent(self):
        """Run seed twice; no duplicate records (update if exists, insert if not)."""
        from app.services.seed_profile import run_seed

        create_db_and_tables()
        with Session(engine) as session:
            for p in session.exec(select(Profile)).all():
                session.delete(p)
            session.commit()

        run_seed(json_path=PROFILE_JSON_PATH)
        run_seed(json_path=PROFILE_JSON_PATH)

        with Session(engine) as session:
            profiles = session.exec(select(Profile)).all()
            assert len(profiles) == 1


class TestSeedProfileEnvVar:
    """run_seed uses PROFILE_JSON_PATH env var when set. Docker seeds support."""

    def test_run_seed_uses_PROFILE_JSON_PATH_when_set(self, tmp_path):
        """When PROFILE_JSON_PATH is set, run_seed reads from that path."""
        from app.services.seed_profile import run_seed

        tmp_json = tmp_path / "profile.json"
        tmp_json.write_text(json.dumps(PROFILE_JSON_ENV_TEST, ensure_ascii=False), encoding="utf-8")

        create_db_and_tables()
        with Session(engine) as session:
            for p in session.exec(select(Profile)).all():
                session.delete(p)
            session.commit()

        with patch.dict(os.environ, {"PROFILE_JSON_PATH": str(tmp_json)}, clear=False):
            run_seed()

        with Session(engine) as session:
            profiles = session.exec(select(Profile)).all()
            assert len(profiles) == 1
            assert profiles[0].data["full_name"] == "EnvTestUser"

    def test_run_seed_uses_default_path_when_PROFILE_JSON_PATH_unset(self):
        """When PROFILE_JSON_PATH is unset, run_seed uses project_root/docs/profile.json."""
        from app.services.seed_profile import run_seed

        create_db_and_tables()
        with Session(engine) as session:
            for p in session.exec(select(Profile)).all():
                session.delete(p)
            session.commit()

        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("PROFILE_JSON_PATH", None)
            run_seed(json_path=None)

        with Session(engine) as session:
            profiles = session.exec(select(Profile)).all()
            assert len(profiles) == 1
            assert profiles[0].data["full_name"] == "Aarón Kaleb Arteaga Rodríguez"
