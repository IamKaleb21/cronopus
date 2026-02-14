"""
Clear all jobs from the database. Use before re-running scrapers for a fresh load.
Usage: uv run scripts/clear_jobs.py
"""
import os
import sys

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(project_root, "backend"))
os.chdir(project_root)

from sqlmodel import Session, select

from app.database import engine
from app.models.job import Job
from app.models.generated_cv import GeneratedCV


def main() -> None:
    with Session(engine) as session:
        # Delete GeneratedCVs that reference jobs first (FK)
        cvs = list(session.exec(select(GeneratedCV)).all())
        for cv in cvs:
            session.delete(cv)
        # Delete all jobs
        jobs = list(session.exec(select(Job)).all())
        for job in jobs:
            session.delete(job)
        session.commit()
        print(f"Cleared {len(jobs)} jobs and {len(cvs)} generated CVs.")


if __name__ == "__main__":
    main()
