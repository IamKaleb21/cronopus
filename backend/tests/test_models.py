"""
Test 1.2: Backend Models Tests
Based on PRD V1.4 Section 5 - Data Structure
"""
import pytest
from pathlib import Path
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

# Test that required files exist
PROJECT_ROOT = Path(__file__).parent.parent.parent


class TestBackendStructure:
    """Tests for backend project structure."""

    def test_backend_app_directory_exists(self):
        """Backend should have app/ directory."""
        assert (PROJECT_ROOT / "backend" / "app").is_dir()

    def test_backend_models_directory_exists(self):
        """Backend should have app/models/ directory."""
        assert (PROJECT_ROOT / "backend" / "app" / "models").is_dir()

    def test_backend_main_exists(self):
        """Backend should have app/main.py entry point."""
        assert (PROJECT_ROOT / "backend" / "app" / "main.py").is_file()

    def test_backend_config_exists(self):
        """Backend should have app/config.py for settings."""
        assert (PROJECT_ROOT / "backend" / "app" / "config.py").is_file()


class TestJobModel:
    """Tests for Jobs model per PRD Section 5."""

    def test_job_model_exists(self):
        """Job model should be importable."""
        from app.models.job import Job, JobSource, JobStatus
        assert Job is not None

    def test_job_source_enum_values(self):
        """JobSource enum should have required values per PRD."""
        from app.models.job import JobSource
        
        assert hasattr(JobSource, "PRACTICAS_PE")
        assert hasattr(JobSource, "COMPUTRABAJO")

    def test_job_status_enum_values(self):
        """JobStatus enum should have all required values per PRD."""
        from app.models.job import JobStatus
        
        required_statuses = ["NEW", "SAVED", "DISCARDED", "GENERATED", "APPLIED", "EXPIRED"]
        for status in required_statuses:
            assert hasattr(JobStatus, status), f"JobStatus must have {status}"

    def test_job_model_has_required_fields(self):
        """Job model should have all fields defined in PRD."""
        from app.models.job import Job
        
        # Per PRD Section 5 - Table: Jobs
        required_fields = [
            "id", "source", "external_id", "title", "company", 
            "location", "salary", "description", "raw_html", 
            "status", "url", "applied_at", "match_score",
            "created_at", "updated_at"
        ]
        
        model_fields = Job.model_fields.keys()
        for field in required_fields:
            assert field in model_fields, f"Job model must have '{field}' field"


class TestTemplateModel:
    """Tests for Templates model per PRD Section 5."""

    def test_template_model_exists(self):
        """Template model should be importable."""
        from app.models.template import Template
        assert Template is not None

    def test_template_model_has_required_fields(self):
        """Template model should have all fields defined in PRD."""
        from app.models.template import Template
        
        # Per PRD Section 5 - Table: Templates
        required_fields = [
            "id", "name", "version", "content", "is_active",
            "created_at", "updated_at"
        ]
        
        model_fields = Template.model_fields.keys()
        for field in required_fields:
            assert field in model_fields, f"Template model must have '{field}' field"


class TestGeneratedCVModel:
    """Tests for GeneratedCVs model per PRD Section 5."""

    def test_generated_cv_model_exists(self):
        """GeneratedCV model should be importable."""
        from app.models.generated_cv import GeneratedCV
        assert GeneratedCV is not None

    def test_generated_cv_has_required_fields(self):
        """GeneratedCV model should have all fields defined in PRD."""
        from app.models.generated_cv import GeneratedCV
        
        # Per PRD Section 5 - Table: GeneratedCVs
        required_fields = [
            "id", "job_id", "latex_content", "template_id", "notes",
            "created_at", "updated_at"
        ]
        
        model_fields = GeneratedCV.model_fields.keys()
        for field in required_fields:
            assert field in model_fields, f"GeneratedCV model must have '{field}' field"


class TestFastAPIApp:
    """Tests for FastAPI application configuration."""

    def test_fastapi_app_exists(self):
        """FastAPI app should be importable."""
        from app.main import app
        assert app is not None

    def test_fastapi_app_has_cors(self):
        """FastAPI app should have CORS middleware configured."""
        from app.main import app
        from starlette.middleware.cors import CORSMiddleware
        
        cors_found = any(
            isinstance(m.cls, type) and issubclass(m.cls, CORSMiddleware)
            for m in app.user_middleware
        )
        # Alternative check if middleware is added differently
        middleware_names = [str(m) for m in app.user_middleware]
        assert cors_found or any("CORS" in str(m) for m in middleware_names), \
            "CORS middleware must be configured"
