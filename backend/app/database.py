"""
CronOpus Database Configuration
Based on PRD V1.4 - PostgreSQL with SQLModel
"""
from sqlmodel import SQLModel, Session, create_engine
from typing import Generator

from app.config import get_settings
from app.models.job import Job  # noqa: F401 - register table
from app.models.template import Template  # noqa: F401
from app.models.generated_cv import GeneratedCV  # noqa: F401
from app.models.profile import Profile  # noqa: F401

settings = get_settings()

# Create database engine
# SQLite for development, PostgreSQL for production
connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.database_url,
    echo=False,  # Set to True for SQL query logging
    connect_args=connect_args,
)


def create_db_and_tables():
    """Create all database tables from SQLModel metadata."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI that provides a database session.
    
    Usage:
        @app.get("/items")
        def get_items(session: Session = Depends(get_session)):
            return session.exec(select(Item)).all()
    """
    with Session(engine) as session:
        yield session
