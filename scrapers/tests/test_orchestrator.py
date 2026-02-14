"""
Tests for ScraperOrchestrator (TDD - RED phase)
Tests written BEFORE implementation to define expected behavior.
"""
import pytest
import asyncio
import logging
from unittest.mock import AsyncMock, MagicMock, patch
from dataclasses import dataclass


# ─── Test Fixtures ───────────────────────────────────────────────────────────

class FakeScraperSuccess:
    """Mock scraper that succeeds and returns 5 jobs."""
    source = MagicMock()
    source.value = "fake_success"
    
    async def run(self) -> int:
        return 5


class FakeScraperFailure:
    """Mock scraper that raises an exception."""
    source = MagicMock()
    source.value = "fake_failure"
    
    async def run(self) -> int:
        raise ConnectionError("Simulated network failure")


class FakeScraperSlow:
    """Mock scraper that takes 0.1s and returns 3 jobs."""
    source = MagicMock()
    source.value = "fake_slow"
    
    async def run(self) -> int:
        await asyncio.sleep(0.1)
        return 3


# ─── Tests ───────────────────────────────────────────────────────────────────

@pytest.fixture
def orchestrator():
    from scrapers.orchestrator import ScraperOrchestrator
    return ScraperOrchestrator()


class TestRunAll:
    """Tests for ScraperOrchestrator.run_all()"""
    
    @pytest.mark.asyncio
    async def test_run_all_success(self, orchestrator):
        """Both scrapers succeed → results for both with status 'success'."""
        scraper_a = FakeScraperSuccess()
        scraper_b = FakeScraperSlow()
        
        results = await orchestrator.run_all(scrapers=[scraper_a, scraper_b])
        
        assert len(results) == 2
        assert all(r.status == "success" for r in results)
        assert results[0].jobs_saved == 5
        assert results[1].jobs_saved == 3

    @pytest.mark.asyncio
    async def test_run_all_partial_failure(self, orchestrator):
        """One scraper fails, the other still runs successfully."""
        scraper_ok = FakeScraperSuccess()
        scraper_bad = FakeScraperFailure()
        
        results = await orchestrator.run_all(scrapers=[scraper_bad, scraper_ok])
        
        assert len(results) == 2
        
        # Failed scraper
        failed = [r for r in results if r.status == "error"]
        assert len(failed) == 1
        assert "Simulated network failure" in failed[0].error
        assert failed[0].jobs_saved == 0
        
        # Successful scraper
        succeeded = [r for r in results if r.status == "success"]
        assert len(succeeded) == 1
        assert succeeded[0].jobs_saved == 5

    @pytest.mark.asyncio
    async def test_run_all_both_fail(self, orchestrator):
        """Both scrapers fail → no crash, returns error results for both."""
        scraper_a = FakeScraperFailure()
        scraper_b = FakeScraperFailure()
        
        results = await orchestrator.run_all(scrapers=[scraper_a, scraper_b])
        
        assert len(results) == 2
        assert all(r.status == "error" for r in results)
        assert all(r.jobs_saved == 0 for r in results)
        assert all(r.error is not None for r in results)

    @pytest.mark.asyncio
    async def test_run_all_empty_scrapers(self, orchestrator):
        """No scrapers registered → returns empty list."""
        results = await orchestrator.run_all(scrapers=[])
        assert results == []


class TestResultStructure:
    """Tests for ScraperResult dataclass."""
    
    @pytest.mark.asyncio
    async def test_result_has_all_fields(self, orchestrator):
        """Each result has source, status, jobs_saved, duration_seconds, error."""
        scraper = FakeScraperSuccess()
        
        results = await orchestrator.run_all(scrapers=[scraper])
        result = results[0]
        
        assert hasattr(result, 'source')
        assert hasattr(result, 'status')
        assert hasattr(result, 'jobs_saved')
        assert hasattr(result, 'duration_seconds')
        assert hasattr(result, 'error')

    @pytest.mark.asyncio
    async def test_result_duration_is_positive(self, orchestrator):
        """Duration should be a positive float."""
        scraper = FakeScraperSlow()
        
        results = await orchestrator.run_all(scrapers=[scraper])
        result = results[0]
        
        assert isinstance(result.duration_seconds, float)
        assert result.duration_seconds >= 0.1  # FakeScraperSlow has 0.1s delay

    @pytest.mark.asyncio
    async def test_success_result_has_no_error(self, orchestrator):
        """Successful result has error=None."""
        scraper = FakeScraperSuccess()
        
        results = await orchestrator.run_all(scrapers=[scraper])
        assert results[0].error is None

    @pytest.mark.asyncio
    async def test_error_result_has_zero_jobs(self, orchestrator):
        """Failed result has jobs_saved=0."""
        scraper = FakeScraperFailure()
        
        results = await orchestrator.run_all(scrapers=[scraper])
        assert results[0].jobs_saved == 0
        assert results[0].status == "error"


class TestScheduler:
    """Tests for scheduler configuration."""
    
    def test_scheduler_has_24h_interval(self, orchestrator):
        """Scheduler should be configured with 24-hour interval."""
        from apscheduler.triggers.interval import IntervalTrigger
        
        orchestrator.start_scheduler(interval_hours=24)
        
        jobs = orchestrator.scheduler.get_jobs()
        assert len(jobs) == 1
        
        trigger = jobs[0].trigger
        assert isinstance(trigger, IntervalTrigger)
        assert trigger.interval.total_seconds() == 24 * 3600
        
        orchestrator.stop_scheduler()

    def test_scheduler_can_stop(self, orchestrator):
        """Scheduler should stop gracefully."""
        orchestrator.start_scheduler(interval_hours=24)
        orchestrator.stop_scheduler()
        
        assert not orchestrator.scheduler.running


class TestLogging:
    """Tests for structured logging."""
    
    @pytest.mark.asyncio
    async def test_logs_error_on_scraper_failure(self, orchestrator, caplog):
        """Logger should capture error when a scraper fails."""
        scraper = FakeScraperFailure()
        
        with caplog.at_level(logging.ERROR):
            await orchestrator.run_all(scrapers=[scraper])
        
        assert any("fake_failure" in record.message.lower() or "simulated" in record.message.lower() 
                    for record in caplog.records if record.levelno >= logging.ERROR)

    @pytest.mark.asyncio
    async def test_logs_summary_after_run(self, orchestrator, caplog):
        """Logger should log a summary after all scrapers run."""
        scraper = FakeScraperSuccess()
        
        with caplog.at_level(logging.INFO):
            await orchestrator.run_all(scrapers=[scraper])
        
        # Should have at least one INFO log about completion
        assert len(caplog.records) > 0
