"""
Tests for BaseScraper.mark_missing_as_expired (Enfoque 2: mark jobs not in current listing).
Uses in-memory SQLite for isolation from shared project DB.
"""
import sys
from pathlib import Path

import pytest
from sqlmodel import Session, select, create_engine, SQLModel

# Ensure backend is on path (scrapers.database does this; tests run from project root)
_backend = Path(__file__).resolve().parent.parent.parent / "backend"
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from scrapers.database import get_session, Job, JobSource, JobStatus
from scrapers.utils import generate_job_hash


@pytest.fixture
def db_with_jobs(monkeypatch):
    """Create in-memory DB, two jobs: one NEW (id1), one SAVED (id2). Patch scrapers to use it."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(test_engine)
    monkeypatch.setattr("scrapers.database.engine", test_engine)

    id1 = generate_job_hash("Title One", "Company A")
    id2 = generate_job_hash("Title Two", "Company B")
    with Session(test_engine) as session:
        j1 = Job(
            source=JobSource.PRACTICAS_PE,
            external_id=id1,
            title="Title One",
            company="Company A",
            location="Lima",
            description="Desc",
            url="https://example.com/1",
            status=JobStatus.NEW,
        )
        j2 = Job(
            source=JobSource.PRACTICAS_PE,
            external_id=id2,
            title="Title Two",
            company="Company B",
            location="Lima",
            description="Desc",
            url="https://example.com/2",
            status=JobStatus.SAVED,
        )
        session.add(j1)
        session.add(j2)
        session.commit()
        session.refresh(j1)
        session.refresh(j2)
    yield {"id1": id1, "id2": id2, "job1": j1, "job2": j2, "engine": test_engine}


def test_mark_missing_as_expired_updates_status(db_with_jobs):
    """Jobs not in current listing (same source) get status EXPIRED."""
    from scrapers.practicas_pe import PracticasPeScraper

    scraper = PracticasPeScraper()
    # Current listing only has "Title One" / "Company A" -> id1
    current_job_dicts = [{"title": "Title One", "company": "Company A"}]
    count = scraper.mark_missing_as_expired(current_job_dicts)

    assert count == 1
    with get_session() as session:
        stmt = select(Job).where(Job.source == JobSource.PRACTICAS_PE)
        jobs = list(session.exec(stmt).all())
    by_ext = {j.external_id: j for j in jobs}
    assert len(by_ext) == 2
    id1 = db_with_jobs["id1"]
    id2 = db_with_jobs["id2"]
    assert by_ext[id1].status == JobStatus.NEW
    assert by_ext[id2].status == JobStatus.EXPIRED


def test_mark_missing_as_expired_ignores_applied_discarded(db_with_jobs):
    """Jobs with status APPLIED or DISCARDED are not changed to EXPIRED."""
    from scrapers.practicas_pe import PracticasPeScraper

    test_engine = db_with_jobs["engine"]
    # Set job2 to APPLIED
    with Session(test_engine) as session:
        j2 = session.exec(select(Job).where(Job.external_id == db_with_jobs["id2"])).one()
        j2.status = JobStatus.APPLIED
        session.add(j2)
        session.commit()

    scraper = PracticasPeScraper()
    # Listing only has id1; id2 is missing but is APPLIED
    current_job_dicts = [{"title": "Title One", "company": "Company A"}]
    count = scraper.mark_missing_as_expired(current_job_dicts)

    assert count == 0
    with get_session() as session:
        j2 = session.exec(select(Job).where(Job.external_id == db_with_jobs["id2"])).one()
    assert j2.status == JobStatus.APPLIED


def test_mark_missing_as_expired_returns_count(db_with_jobs):
    """Return value is the number of rows updated."""
    from scrapers.practicas_pe import PracticasPeScraper

    scraper = PracticasPeScraper()
    # Empty listing -> both id1 and id2 should be expired (only NEW and SAVED)
    current_job_dicts = []
    count = scraper.mark_missing_as_expired(current_job_dicts)

    assert count == 2
    with get_session() as session:
        for row in session.exec(select(Job).where(Job.source == JobSource.PRACTICAS_PE)).all():
            assert row.status == JobStatus.EXPIRED
