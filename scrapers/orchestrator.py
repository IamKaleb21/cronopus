"""
CronOpus Scraper Orchestrator
Based on PRD V1.4 Section 2.4 - Orquestación de Scrapers

Runs all scrapers with fault isolation (one failure doesn't affect others)
and scheduled execution via APScheduler (every 24 hours).
"""
import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import List, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)


@dataclass
class ScraperResult:
    """Result of a single scraper execution."""
    source: str
    status: str  # "success" or "error"
    jobs_saved: int = 0
    duration_seconds: float = 0.0
    error: Optional[str] = None


class ScraperOrchestrator:
    """
    Runs all registered scrapers with fault isolation and structured logging.
    
    One scraper failing does NOT prevent others from running.
    Results are collected and returned for each scraper independently.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.scheduler: Optional[BackgroundScheduler] = None
    
    async def run_all(self, scrapers: Optional[List] = None) -> List[ScraperResult]:
        """
        Run each scraper independently, collecting results.
        
        Args:
            scrapers: List of scraper instances to run. If None, uses default scrapers.
            
        Returns:
            List of ScraperResult, one per scraper.
        """
        if scrapers is None:
            scrapers = self._get_default_scrapers()
        
        if not scrapers:
            return []
        
        results: List[ScraperResult] = []
        
        for scraper in scrapers:
            source_name = getattr(scraper, 'source', None)
            source_label = getattr(source_name, 'value', str(source_name)) if source_name else "unknown"
            
            start_time = time.monotonic()
            
            try:
                self.logger.info(f"Starting scraper: {source_label}")
                jobs_saved = await scraper.run()
                duration = time.monotonic() - start_time
                
                result = ScraperResult(
                    source=source_label,
                    status="success",
                    jobs_saved=jobs_saved,
                    duration_seconds=duration,
                )
                self.logger.info(
                    f"Scraper {source_label} completed: {jobs_saved} jobs saved "
                    f"in {duration:.1f}s"
                )
                
            except Exception as e:
                duration = time.monotonic() - start_time
                result = ScraperResult(
                    source=source_label,
                    status="error",
                    jobs_saved=0,
                    duration_seconds=duration,
                    error=str(e),
                )
                self.logger.error(
                    f"Scraper {source_label} failed after {duration:.1f}s: {e}"
                )
            
            results.append(result)
        
        # Summary log
        total_jobs = sum(r.jobs_saved for r in results)
        succeeded = sum(1 for r in results if r.status == "success")
        failed = sum(1 for r in results if r.status == "error")
        self.logger.info(
            f"Orchestration complete: {succeeded} succeeded, {failed} failed, "
            f"{total_jobs} total jobs saved"
        )
        
        return results
    
    def _get_default_scrapers(self) -> List:
        """Instantiate and return all registered scrapers."""
        scrapers = []
        
        try:
            from scrapers.computrabajo import CompuTrabajoScraper
            scrapers.append(CompuTrabajoScraper())
        except Exception as e:
            self.logger.error(f"Failed to initialize CompuTrabajoScraper: {e}")
        
        try:
            from scrapers.practicas_pe import PracticasPeScraper
            scrapers.append(PracticasPeScraper())
        except Exception as e:
            self.logger.error(f"Failed to initialize PracticasPeScraper: {e}")
        
        return scrapers
    
    def start_scheduler(self, interval_hours: int = 24):
        """
        Start the APScheduler with an interval trigger.
        
        Args:
            interval_hours: Hours between each scraping run (default: 24)
        """
        self.scheduler = BackgroundScheduler()
        
        self.scheduler.add_job(
            func=self._scheduled_run,
            trigger=IntervalTrigger(hours=interval_hours),
            id="scraper_orchestration",
            name=f"Run all scrapers every {interval_hours}h",
            replace_existing=True,
        )
        
        self.scheduler.start()
        self.logger.info(f"Scheduler started: running every {interval_hours} hours")
    
    def stop_scheduler(self):
        """Stop the scheduler gracefully."""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            self.logger.info("Scheduler stopped")
    
    def _scheduled_run(self):
        """Wrapper to run async run_all() from the scheduler's sync context."""
        loop = asyncio.new_event_loop()
        try:
            results = loop.run_until_complete(self.run_all())
            return results
        finally:
            loop.close()
