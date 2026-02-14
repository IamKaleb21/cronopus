"""
CronOpus Scrapers Utilities
Based on PRD V1.4 Section A - Gestor de Estados (duplicate detection)
"""
import hashlib
from typing import Optional, List, Dict, Any

from sqlmodel import Session, select


def generate_job_hash(title: str, company: str) -> str:
    """
    Generate a unique hash for a job based on title and company.
    
    Per PRD: "Gestor de Estados: Lógica para evitar duplicados (Hash del título + empresa)"
    
    Args:
        title: Job title
        company: Company name
        
    Returns:
        SHA256 hash string (first 16 characters for brevity)
    """
    # Normalize: lowercase, strip whitespace
    normalized = f"{title.lower().strip()}|{company.lower().strip()}"
    hash_full = hashlib.sha256(normalized.encode('utf-8')).hexdigest()
    return hash_full[:16]  # First 16 chars are sufficient for uniqueness


def is_duplicate_job(session: Session, external_id: str, source) -> bool:
    """
    Check if a job with the given external_id already exists.
    
    Args:
        session: Database session
        external_id: Hash of title + company
        source: JobSource enum value
        
    Returns:
        True if job already exists, False otherwise
    """
    from scrapers.database import Job
    
    statement = select(Job).where(
        Job.external_id == external_id,
        Job.source == source
    )
    result = session.exec(statement).first()
    return result is not None


def filter_duplicate_jobs_batch(
    session: Session,
    jobs: List[Dict[str, Any]],
    source,
) -> List[Dict[str, Any]]:
    """
    Filter out jobs that already exist in DB using a single batch query.

    Args:
        session: Database session
        jobs: List of job dicts that MUST include 'external_id'
        source: JobSource enum value

    Returns:
        List of job dicts that are NOT yet present in the DB.
    """
    if not jobs:
        return []

    # Collect all external_ids present in the incoming jobs
    external_ids = {job.get("external_id") for job in jobs if job.get("external_id")}
    if not external_ids:
        # Nothing to filter if we don't have identifiers
        return jobs

    from scrapers.database import Job  # Local import to avoid circulars at import time

    statement = select(Job).where(
        Job.external_id.in_(external_ids),
        Job.source == source,
    )
    existing_rows = session.exec(statement).all()

    # Support both ORM rows and simple namespaces in tests
    existing_ids = {getattr(row, "external_id", None) for row in existing_rows}

    return [job for job in jobs if job.get("external_id") not in existing_ids]


def sanitize_text(text: str) -> str:
    """
    Clean and normalize text from HTML scraping.
    
    Args:
        text: Raw text from HTML
        
    Returns:
        Cleaned text with normalized whitespace
    """
    if not text:
        return ""
    
    # Normalize whitespace
    cleaned = " ".join(text.split())
    return cleaned.strip()
