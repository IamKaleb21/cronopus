"""
CronOpus Scrapers Database Connection
Based on PRD V1.4 - Scrapers write directly to shared DB

This module provides database access for scrapers, importing models
from the backend to ensure consistency.
"""
import sys
from pathlib import Path
from contextlib import contextmanager
from typing import Generator

from sqlmodel import Session, create_engine

# Add backend to path to import models
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Import models from backend
from app.models.job import Job, JobSource, JobStatus
from app.models.template import Template
from app.models.generated_cv import GeneratedCV
from app.config import get_settings

# Get settings and create engine
settings = get_settings()

# Create database engine (same as backend)
connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.database_url,
    echo=False,
    connect_args=connect_args,
)


@contextmanager
def get_session() -> Generator[Session, None, None]:
    """
    Context manager for database session.
    
    Usage:
        with get_session() as session:
            session.add(job)
            session.commit()
    """
    with Session(engine) as session:
        yield session


# Re-export for convenience
__all__ = [
    'engine',
    'get_session',
    'Job',
    'JobSource',
    'JobStatus',
    'Template',
    'GeneratedCV',
]
