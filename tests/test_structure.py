"""
Test 1.1: Repository Structure Tests
Based on PRD V1.4 Architecture requirements
"""
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent


class TestRepositoryStructure:
    """Tests for verifying the monorepo structure according to PRD."""

    def test_frontend_directory_exists(self):
        """Frontend directory should exist for React + Vite app."""
        assert (PROJECT_ROOT / "frontend").is_dir(), "frontend/ directory must exist"

    def test_backend_directory_exists(self):
        """Backend directory should exist for FastAPI app."""
        assert (PROJECT_ROOT / "backend").is_dir(), "backend/ directory must exist"

    def test_scrapers_directory_exists(self):
        """Scrapers directory should exist (decoupled modules per PRD)."""
        assert (PROJECT_ROOT / "scrapers").is_dir(), "scrapers/ directory must exist"

    def test_telegram_bot_directory_exists(self):
        """Telegram bot directory should exist as separate service."""
        assert (PROJECT_ROOT / "telegram-bot").is_dir(), "telegram-bot/ directory must exist"

    def test_docker_compose_exists(self):
        """docker-compose.yml should exist for orchestration."""
        assert (PROJECT_ROOT / "docker-compose.yml").is_file(), "docker-compose.yml must exist"

    def test_gitignore_exists(self):
        """.gitignore should exist with proper exclusions."""
        gitignore = PROJECT_ROOT / ".gitignore"
        assert gitignore.is_file(), ".gitignore must exist"
        
        content = gitignore.read_text()
        # Check essential patterns
        assert "__pycache__" in content, ".gitignore should exclude __pycache__"
        assert "node_modules" in content, ".gitignore should exclude node_modules"
        assert ".env" in content, ".gitignore should exclude .env"


class TestDockerComposeServices:
    """Tests for docker-compose.yml according to PRD deployment strategy."""

    def test_docker_compose_has_required_services(self):
        """docker-compose.yml should define all required services from PRD."""
        compose_file = PROJECT_ROOT / "docker-compose.yml"
        assert compose_file.is_file(), "docker-compose.yml must exist"
        
        content = compose_file.read_text()
        
        # Per PRD Section 7: Deployment Strategy
        required_services = ["frontend", "backend", "db", "telegram-bot"]
        for service in required_services:
            assert service in content, f"docker-compose.yml should define '{service}' service"
