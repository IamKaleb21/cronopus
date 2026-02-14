"""
Tests for Infrastructure Configuration (TDD)
Phase 3.5: Dockerization
"""
import os
import shutil
import subprocess

import pytest
import yaml
from pathlib import Path


PROJECT_ROOT = Path(__file__).parent.parent


def load_docker_compose():
    with open(PROJECT_ROOT / "docker-compose.yml", "r") as f:
        return yaml.safe_load(f)


class TestDockerCompose:
    """Tests for docker-compose.yml configuration."""

    def test_telegram_bot_build_context(self):
        """
        The telegram-bot needs access to 'backend' and 'scrapers' modules.
        Therefore, the build context MUST be the project root ('.'), 
        not './telegram-bot'.
        """
        config = load_docker_compose()
        service = config["services"].get("telegram-bot")
        
        assert service is not None, "telegram-bot service not missing"
        
        context = service["build"]["context"]
        # It currently is './telegram-bot' (which is wrong), so this test expects '.'
        assert context == ".", f"Build context should be '.' to access sibling modules, found '{context}'"

    def test_telegram_bot_dockerfile_path(self):
        """Dockerfile should be specified relative to root if context is root."""
        config = load_docker_compose()
        service = config["services"].get("telegram-bot")
        
        dockerfile = service["build"]["dockerfile"]
        # If context is '.', dockerfile should be 'telegram-bot/Dockerfile'
        assert dockerfile == "telegram-bot/Dockerfile"

    def test_frontend_dockerfile_exists(self):
        """frontend/Dockerfile should exist for React + Vite container build."""
        dockerfile = PROJECT_ROOT / "frontend" / "Dockerfile"
        assert dockerfile.is_file(), "frontend/Dockerfile must exist for frontend service"

    def test_scrapers_dockerfiles_exist(self):
        """Scrapers should have dedicated Dockerfiles for each source."""
        practicas = PROJECT_ROOT / "scrapers" / "Dockerfile.practicas"
        computrabajo = PROJECT_ROOT / "scrapers" / "Dockerfile.computrabajo"
        assert practicas.is_file(), "scrapers/Dockerfile.practicas must exist for scraper-practicas service"
        assert computrabajo.is_file(), "scrapers/Dockerfile.computrabajo must exist for scraper-computrabajo service"

    def test_scrapers_build_from_root_context(self):
        """
        Scraper services should build from project root to access pyproject.toml and uv.lock.
        docker-compose should use context '.' and dockerfile under 'scrapers/'.
        """
        config = load_docker_compose()

        practicas = config["services"].get("scraper-practicas")
        computrabajo = config["services"].get("scraper-computrabajo")

        assert practicas is not None, "scraper-practicas service missing"
        assert computrabajo is not None, "scraper-computrabajo service missing"

        assert practicas["build"]["context"] == ".", "scraper-practicas build context should be '.'"
        assert computrabajo["build"]["context"] == ".", "scraper-computrabajo build context should be '.'"

        assert practicas["build"]["dockerfile"] == "scrapers/Dockerfile.practicas"
        assert computrabajo["build"]["dockerfile"] == "scrapers/Dockerfile.computrabajo"

    def test_backend_dockerfile_uses_uv(self):
        """Backend Dockerfile should use uv (repo convention) instead of pip."""
        dockerfile = (PROJECT_ROOT / "backend" / "Dockerfile").read_text(encoding="utf-8")
        assert "ghcr.io/astral-sh/uv" in dockerfile, "backend/Dockerfile should install uv via ghcr.io/astral-sh/uv"
        assert "uv pip install" in dockerfile, "backend/Dockerfile should install deps via 'uv pip install'"

    def test_backend_has_docs_volume(self):
        """Backend must mount ./docs:/docs for seed_profile and seed_template."""
        config = load_docker_compose()
        backend = config["services"].get("backend")
        assert backend is not None, "backend service missing"
        volumes = backend.get("volumes") or []
        docs_mount = next((v for v in volumes if "/docs" in str(v)), None)
        assert docs_mount is not None, "backend must have volume ./docs:/docs (or equivalent) for Docker seeds"

    def test_backend_has_seed_env_vars(self):
        """Backend environment must include PROFILE_JSON_PATH and TEMPLATE_TEX_PATH for Docker seeds."""
        config = load_docker_compose()
        backend = config["services"].get("backend")
        assert backend is not None, "backend service missing"
        env = backend.get("environment") or {}
        if isinstance(env, list):
            env_dict = {}
            for item in env:
                if "=" in item:
                    k, v = item.split("=", 1)
                    env_dict[k] = v
        else:
            env_dict = env
        assert "PROFILE_JSON_PATH" in env_dict, "backend must have PROFILE_JSON_PATH env var"
        assert "TEMPLATE_TEX_PATH" in env_dict, "backend must have TEMPLATE_TEX_PATH env var"
        assert "/docs/profile.json" in str(env_dict.get("PROFILE_JSON_PATH", "")), "PROFILE_JSON_PATH should point to /docs/profile.json"
        assert "/docs/cv_master_jinja.tex" in str(env_dict.get("TEMPLATE_TEX_PATH", "")), "TEMPLATE_TEX_PATH should point to /docs/cv_master_jinja.tex"


class TestBackendEntrypoint:
    """Backend must run seeds before uvicorn. Docker seeds support."""

    def test_entrypoint_script_exists(self):
        """backend/entrypoint.sh must exist and be executable (or Dockerfile chmods it)."""
        entrypoint = PROJECT_ROOT / "backend" / "entrypoint.sh"
        assert entrypoint.is_file(), "backend/entrypoint.sh must exist for Docker seeds"

    def test_backend_uses_entrypoint_script(self):
        """Backend Dockerfile must use entrypoint that runs seeds then uvicorn."""
        dockerfile = (PROJECT_ROOT / "backend" / "Dockerfile").read_text(encoding="utf-8")
        assert "entrypoint" in dockerfile.lower(), "Dockerfile must reference entrypoint.sh"
        assert "entrypoint.sh" in dockerfile or "entrypoint" in dockerfile, "Dockerfile must use entrypoint.sh"

    def test_entrypoint_runs_seeds_then_uvicorn(self):
        """Entrypoint content must invoke seed_profile, seed_template, then uvicorn."""
        entrypoint = (PROJECT_ROOT / "backend" / "entrypoint.sh").read_text(encoding="utf-8")
        assert "seed_profile" in entrypoint or "run_seed" in entrypoint, "entrypoint must run seed_profile"
        assert "seed_template" in entrypoint or "run_tmpl" in entrypoint, "entrypoint must run seed_template"
        assert "uvicorn" in entrypoint, "entrypoint must exec uvicorn"


class TestDockerBuilds:
    """Optional smoke tests to ensure Dockerfiles build successfully."""

    @pytest.mark.skipif(shutil.which("docker") is None, reason="docker CLI not available")
    def test_frontend_image_builds(self):
        """`docker build` for frontend should succeed."""
        result = subprocess.run(
            ["docker", "build", "-f", "frontend/Dockerfile", "frontend"],
            cwd=os.fspath(PROJECT_ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        assert result.returncode == 0, f"frontend Docker build failed:\n{result.stdout.decode()}"

    @pytest.mark.skipif(shutil.which("docker") is None, reason="docker CLI not available")
    def test_scraper_practicas_image_builds(self):
        """`docker build` for scraper Practicas should succeed."""
        result = subprocess.run(
            ["docker", "build", "-f", "scrapers/Dockerfile.practicas", "."],
            cwd=os.fspath(PROJECT_ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        assert result.returncode == 0, f"scraper Practicas Docker build failed:\n{result.stdout.decode()}"

    @pytest.mark.skipif(shutil.which("docker") is None, reason="docker CLI not available")
    def test_scraper_practicas_image_has_minimal_deps(self):
        """
        Practicas image should install only scraper deps (no fastapi, uvicorn, playwright, etc.)
        and must include httpx, beautifulsoup4, psycopg2-binary, sqlmodel, pydantic-settings.
        """
        result = subprocess.run(
            ["docker", "build", "-f", "scrapers/Dockerfile.practicas", "-t", "cronopus-scraper-practicas:deps", "."],
            cwd=os.fspath(PROJECT_ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=600,
        )
        assert result.returncode == 0, f"scraper Practicas Docker build failed:\n{result.stdout.decode()}"

        list_result = subprocess.run(
            ["docker", "run", "--rm", "cronopus-scraper-practicas:deps", "uv", "pip", "list", "--python", "/app/.venv/bin/python"],
            cwd=os.fspath(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=30,
        )
        assert list_result.returncode == 0, f"uv pip list failed:\n{list_result.stderr}"
        out = (list_result.stdout or "").lower()

        # Must NOT contain monorepo-only deps (scraper does not use these)
        for pkg in ("fastapi", "uvicorn", "playwright", "google-genai", "google_genai", "python-telegram-bot", "apscheduler"):
            assert pkg not in out, f"Image should not contain {pkg} (minimal deps for scraper)"

        # Must contain scraper runtime deps
        assert "httpx" in out, "Image must contain httpx"
        assert "beautifulsoup4" in out or "bs4" in out, "Image must contain beautifulsoup4"
        assert "psycopg2" in out, "Image must contain psycopg2-binary"
        assert "sqlmodel" in out, "Image must contain sqlmodel"
        assert "pydantic" in out, "Image must contain pydantic-settings/pydantic"

    @pytest.mark.skipif(shutil.which("docker") is None, reason="docker CLI not available")
    def test_scraper_computrabajo_image_builds(self):
        """`docker build` for scraper CompuTrabajo should succeed."""
        result = subprocess.run(
            ["docker", "build", "-f", "scrapers/Dockerfile.computrabajo", "."],
            cwd=os.fspath(PROJECT_ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        assert result.returncode == 0, f"scraper CompuTrabajo Docker build failed:\n{result.stdout.decode()}"

    @pytest.mark.skipif(shutil.which("docker") is None, reason="docker CLI not available")
    def test_scraper_computrabajo_playwright_smoke(self):
        """
        After building the Computrabajo image, run a minimal Playwright+Chromium
        command inside the container. Ensures Chromium and deps work (no
        'Could not find browser' or missing shared libs).
        """
        result = subprocess.run(
            ["docker", "build", "-f", "scrapers/Dockerfile.computrabajo", "-t", "cronopus-scraper-computrabajo:smoke", "."],
            cwd=os.fspath(PROJECT_ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=600,
        )
        assert result.returncode == 0, f"scraper CompuTrabajo Docker build failed:\n{result.stdout.decode()}"

        smoke_cmd = [
            "docker", "run", "--rm",
            "cronopus-scraper-computrabajo:smoke",
            "uv", "run", "python", "-c",
            "from playwright.sync_api import sync_playwright; "
            "p = sync_playwright().start(); "
            "b = p.chromium.launch(headless=True); "
            "b.close(); "
            "p.stop(); "
            "print('ok')",
        ]
        run_result = subprocess.run(
            smoke_cmd,
            cwd=os.fspath(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=120,
        )
        assert run_result.returncode == 0, (
            f"Playwright smoke failed (exit {run_result.returncode}):\n"
            f"stdout: {run_result.stdout}\nstderr: {run_result.stderr}"
        )
        assert "Could not find browser" not in (run_result.stderr or "") + (run_result.stdout or "")
        assert "ok" in (run_result.stdout or "")

    @pytest.mark.skipif(shutil.which("docker") is None, reason="docker CLI not available")
    def test_scraper_computrabajo_image_has_minimal_deps(self):
        """
        Computrabajo image should install only scraper deps (no fastapi, uvicorn, etc.)
        and must include playwright, psycopg2-binary, sqlmodel, pydantic-settings.
        """
        result = subprocess.run(
            ["docker", "build", "-f", "scrapers/Dockerfile.computrabajo", "-t", "cronopus-scraper-computrabajo:deps", "."],
            cwd=os.fspath(PROJECT_ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=600,
        )
        assert result.returncode == 0, f"scraper CompuTrabajo Docker build failed:\n{result.stdout.decode()}"

        list_result = subprocess.run(
            ["docker", "run", "--rm", "cronopus-scraper-computrabajo:deps", "uv", "pip", "list", "--python", "/app/.venv/bin/python"],
            cwd=os.fspath(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=30,
        )
        assert list_result.returncode == 0, f"uv pip list failed:\n{list_result.stderr}"
        out = (list_result.stdout or "").lower()

        # Must NOT contain monorepo-only deps (scraper does not use these)
        for pkg in ("fastapi", "uvicorn", "google-genai", "google_genai", "python-telegram-bot", "apscheduler"):
            assert pkg not in out, f"Image should not contain {pkg} (minimal deps for scraper)"

        # Must contain scraper runtime deps
        assert "playwright" in out, "Image must contain playwright"
        assert "psycopg2" in out, "Image must contain psycopg2-binary"
        assert "sqlmodel" in out, "Image must contain sqlmodel"
        assert "pydantic" in out, "Image must contain pydantic-settings/pydantic"
