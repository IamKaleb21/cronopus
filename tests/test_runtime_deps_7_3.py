"""
Task 7.3 guardrails: prevent local compose runtime failures.

These tests are intentionally "static" checks so they run fast in CI
and catch missing runtime deps before a manual docker-compose verification.
"""

from pathlib import Path

import yaml


PROJECT_ROOT = Path(__file__).parent.parent


def load_docker_compose():
    with open(PROJECT_ROOT / "docker-compose.yml", "r") as f:
        return yaml.safe_load(f)


class TestPostgresDriverPresence:
    def test_backend_requirements_include_postgres_driver(self):
        """
        docker-compose configures backend DATABASE_URL as postgresql://...
        Therefore the backend image must include a PostgreSQL DBAPI driver.
        """
        config = load_docker_compose()
        backend = config["services"]["backend"]
        db_url = backend["environment"]["DATABASE_URL"]
        assert str(db_url).startswith("postgresql://"), "Expected backend DATABASE_URL to use postgresql:// scheme"

        req = (PROJECT_ROOT / "backend" / "requirements.txt").read_text(encoding="utf-8").lower()
        assert (
            "psycopg2" in req or "psycopg" in req
        ), "backend/requirements.txt must include a PostgreSQL driver (psycopg2-binary/psycopg2/psycopg)"

    def test_pyproject_includes_postgres_driver_for_uv_images(self):
        """
        Scrapers and telegram-bot images install deps via uv sync from root pyproject/uv.lock.
        Since they run against PostgreSQL in docker-compose, the root deps must include a driver too.
        """
        pyproject = (PROJECT_ROOT / "pyproject.toml").read_text(encoding="utf-8").lower()
        assert (
            "psycopg2" in pyproject or "psycopg" in pyproject
        ), "pyproject.toml must include a PostgreSQL driver for uv-based images"


class TestScrapersImageContents:
    def test_scrapers_images_include_backend_package(self):
        """
        scrapers/database.py currently imports backend models via /app/backend on sys.path.
        Until scrapers are fully decoupled, scraper images must COPY backend/ into the image.
        """
        practicas = (PROJECT_ROOT / "scrapers" / "Dockerfile.practicas").read_text(encoding="utf-8")
        computrabajo = (PROJECT_ROOT / "scrapers" / "Dockerfile.computrabajo").read_text(encoding="utf-8")

        assert "COPY backend/" in practicas, "scrapers/Dockerfile.practicas must copy backend/ for app.* imports"
        assert "COPY backend/" in computrabajo, "scrapers/Dockerfile.computrabajo must copy backend/ for app.* imports"

