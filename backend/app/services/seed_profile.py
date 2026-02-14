"""
Profile seed service (Task 6.5.1).
Loads profile.json and creates/updates the single Profile record in DB.
Docker: uses PROFILE_JSON_PATH env var when set.
"""
import json
import os
from pathlib import Path
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models.profile import Profile


def load_profile_from_json(path: Path) -> dict:
    """
    Load and parse profile JSON file.
    Returns the full structure (full_name, title, contact, summary, skills, etc.).
    """
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def run_seed(json_path: Path | None = None) -> None:
    """
    Seed the Profile: create if none exists, update if one exists.
    Idempotent: running twice does not duplicate records.
    Uses PROFILE_JSON_PATH env var when set (Docker); else json_path or default.
    """
    project_root = Path(__file__).resolve().parents[3]
    env_path = os.environ.get("PROFILE_JSON_PATH")
    path = json_path or (Path(env_path) if env_path else (project_root / "docs" / "profile.json"))
    data = load_profile_from_json(path)

    create_db_and_tables()

    with Session(engine) as session:
        profile = session.exec(select(Profile)).first()
        now = datetime.now(timezone.utc)
        if profile:
            profile.data = data
            profile.updated_at = now
            session.add(profile)
        else:
            profile = Profile(data=data)
            session.add(profile)
        session.commit()
