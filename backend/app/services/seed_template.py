"""
Template seed service (Task 6.5.3).
Loads cv_master_jinja.tex and creates/updates the active template in DB.
Docker: uses TEMPLATE_TEX_PATH env var when set.
"""
import os
from pathlib import Path
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models.template import Template


def run_seed(tex_path: Path | None = None) -> None:
    """
    Seed the active Template with LaTeX+Jinja content.
    Creates template if none exists, updates active if one exists.
    Idempotent.
    Uses TEMPLATE_TEX_PATH env var when set (Docker); else tex_path or default.
    """
    project_root = Path(__file__).resolve().parents[3]
    env_path = os.environ.get("TEMPLATE_TEX_PATH")
    path = tex_path or (Path(env_path) if env_path else (project_root / "docs" / "cv_master_jinja.tex"))
    content = path.read_text(encoding="utf-8")

    create_db_and_tables()

    with Session(engine) as session:
        existing = session.exec(select(Template)).all()
        active = next((t for t in existing if t.is_active), None)

        if active:
            active.content = content
            active.updated_at = datetime.now(timezone.utc)
            session.add(active)
        else:
            # Deactivate any existing
            for t in existing:
                t.is_active = False
                session.add(t)
            template = Template(
                name="CV Jinja Master",
                version=1,
                content=content,
                is_active=True,
            )
            session.add(template)
        session.commit()
