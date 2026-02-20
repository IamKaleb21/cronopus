"""
CronOpus BaseScraper
Based on PRD V1.4 Section A - Módulo de Ingesta (Scrapers Desacoplados)

Abstract base class for all scrapers. Each scraper is independent and
writes directly to the database. If one fails, others continue working.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from sqlmodel import select

from scrapers.database import get_session, Job, JobSource, JobStatus
from scrapers.utils import generate_job_hash, is_duplicate_job, filter_duplicate_jobs_batch


class BaseScraper(ABC):
    """
    Abstract base class for job scrapers.
    
    Each scraper must implement:
    - scrape(): Fetch raw data from the source
    - parse(): Parse raw data into job dictionaries
    
    The save_jobs() method handles database persistence with deduplication.
    """
    
    def __init__(self, source: JobSource):
        self.source = source
        self.logger = logging.getLogger(self.__class__.__name__)
    
    @abstractmethod
    async def scrape(self) -> str:
        """
        Fetch raw HTML/data from the job source.
        
        Returns:
            Raw HTML or data string to be parsed.
        """
        pass
    
    @abstractmethod
    def parse(self, raw_data: str) -> List[Dict[str, Any]]:
        """
        Parse raw data into a list of job dictionaries.
        
        Args:
            raw_data: Raw HTML or data from scrape()
            
        Returns:
            List of job dictionaries with keys:
            - title, company, location, url, description
            - salary (optional)
            - raw_html (optional, for debugging)
        """
        pass
    
    def filter_duplicates(self, jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter out duplicate jobs before fetching details.

        This uses the same external_id logic as save_jobs(), but performs
        a single batch query to the database to determine which jobs are new.
        """
        if not jobs:
            return []

        # Ensure each job has an external_id, using the same hash strategy
        for job in jobs:
            if not job.get("external_id"):
                job["external_id"] = generate_job_hash(
                    job.get("title", ""),
                    job.get("company", ""),
                )

        with get_session() as session:
            filtered = filter_duplicate_jobs_batch(session, jobs, self.source)

        removed = len(jobs) - len(filtered)
        if removed > 0:
            source_label = getattr(self.source, "value", str(self.source))
            self.logger.info(
                f"Filtered out {removed} duplicate jobs before detail fetch (source={source_label})"
            )

        return filtered
    
    def save_jobs(self, jobs: List[Dict[str, Any]]) -> int:
        """
        Save jobs to database, skipping duplicates.
        
        Args:
            jobs: List of job dictionaries from parse()
            
        Returns:
            Number of new jobs saved
        """
        saved_count = 0
        
        with get_session() as session:
            for job_data in jobs:
                # Generate external_id from hash of title + company
                external_id = generate_job_hash(
                    job_data.get('title', ''),
                    job_data.get('company', '')
                )
                
                # Skip duplicates
                if is_duplicate_job(session, external_id, self.source):
                    self.logger.debug(f"Skipping duplicate: {job_data.get('title')}")
                    continue
                
                # Create new job
                job = Job(
                    source=self.source,
                    external_id=external_id,
                    title=job_data.get('title', ''),
                    company=job_data.get('company', ''),
                    location=job_data.get('location', ''),
                    salary=job_data.get('salary'),
                    description=job_data.get('description', ''),
                    raw_html=job_data.get('raw_html'),
                    url=job_data.get('url', ''),
                    status=JobStatus.NEW,
                )
                
                session.add(job)
                saved_count += 1
                self.logger.info(f"Saved job: {job.title} @ {job.company}")
            
            session.commit()
        
        return saved_count

    def mark_missing_as_expired(self, jobs: List[Dict[str, Any]]) -> int:
        """
        Mark jobs as EXPIRED when they are no longer in the current listing (Enfoque 2).
        Only jobs with status NEW, SAVED, or GENERATED are considered.
        """
        current_ids = {
            generate_job_hash(j.get("title", ""), j.get("company", ""))
            for j in jobs
        }
        with get_session() as session:
            stmt = select(Job).where(
                Job.source == self.source,
                Job.status.in_([JobStatus.NEW, JobStatus.SAVED, JobStatus.GENERATED]),
            )
            if current_ids:
                stmt = stmt.where(~Job.external_id.in_(current_ids))
            to_expire = list(session.exec(stmt).all())
            for job in to_expire:
                job.status = JobStatus.EXPIRED
            if to_expire:
                session.add_all(to_expire)
                session.commit()
            count = len(to_expire)
        if count > 0:
            self.logger.info(f"Marked {count} jobs as EXPIRED (no longer in listing)")
        return count

    async def run(self) -> int:
        """
        Execute the full scraping pipeline.
        
        Returns:
            Number of new jobs saved
        """
        self.logger.info(f"Starting {self.source.value} scraper...")
        
        try:
            raw_data = await self.scrape()
            jobs = self.parse(raw_data)
            expired_count = self.mark_missing_as_expired(jobs)
            saved = self.save_jobs(jobs)
            self.logger.info(f"Completed: {expired_count} expired, {saved} new jobs saved")
            return saved
        except Exception as e:
            self.logger.error(f"Scraper failed: {e}")
            raise
