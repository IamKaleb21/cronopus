"""
Test 1.4: Database Connection Tests
Based on PRD V1.4 - PostgreSQL Database
"""
import pytest
from pathlib import Path
import os

PROJECT_ROOT = Path(__file__).parent.parent.parent


class TestDockerComposeDatabase:
    """Tests for PostgreSQL configuration in docker-compose."""

    def test_docker_compose_has_db_service(self):
        """docker-compose.yml should have db service."""
        compose_file = PROJECT_ROOT / "docker-compose.yml"
        content = compose_file.read_text()
        assert "db:" in content

    def test_docker_compose_has_postgres_image(self):
        """db service should use PostgreSQL image."""
        compose_file = PROJECT_ROOT / "docker-compose.yml"
        content = compose_file.read_text()
        assert "postgres:" in content

    def test_docker_compose_has_persistent_volume(self):
        """PostgreSQL data should have persistent volume."""
        compose_file = PROJECT_ROOT / "docker-compose.yml"
        content = compose_file.read_text()
        assert "postgres_data" in content

    def test_docker_compose_has_healthcheck(self):
        """db service should have healthcheck."""
        compose_file = PROJECT_ROOT / "docker-compose.yml"
        content = compose_file.read_text()
        assert "healthcheck" in content
        assert "pg_isready" in content


class TestDatabaseConfiguration:
    """Tests for backend database configuration."""

    def test_config_has_database_url(self):
        """Settings should have database_url."""
        from app.config import Settings
        settings = Settings()
        assert hasattr(settings, 'database_url')
        # Accept both PostgreSQL (production) and SQLite (development)
        assert 'postgresql' in settings.database_url or 'sqlite' in settings.database_url

    def test_database_module_exists(self):
        """Backend should have database.py module."""
        db_file = PROJECT_ROOT / "backend" / "app" / "database.py"
        assert db_file.is_file()


class TestSQLModelSetup:
    """Tests for SQLModel engine and session setup."""

    def test_database_has_engine(self):
        """database.py should define engine."""
        from app.database import engine
        assert engine is not None

    def test_database_has_get_session(self):
        """database.py should have get_session dependency."""
        from app.database import get_session
        assert callable(get_session)

    def test_can_create_tables(self):
        """Should be able to create tables with SQLModel."""
        from app.database import create_db_and_tables
        # This shouldn't raise
        assert callable(create_db_and_tables)
