"""
Test 2.1: Scrapers Infrastructure Tests
Based on PRD V1.4 Section A - Módulo de Ingesta (Scrapers Desacoplados)
"""
import pytest
from pathlib import Path
import hashlib

# scrapers/tests/ -> scrapers/ -> project root
PROJECT_ROOT = Path(__file__).parent.parent.parent


class TestScrapersDirectoryStructure:
    """Tests for scrapers module structure."""

    def test_scrapers_directory_exists(self):
        """scrapers/ directory should exist."""
        assert (PROJECT_ROOT / "scrapers").is_dir()

    def test_scrapers_has_init_file(self):
        """scrapers should be a Python package."""
        assert (PROJECT_ROOT / "scrapers" / "__init__.py").is_file()

    def test_scrapers_has_base_module(self):
        """scrapers should have base.py with BaseScraper."""
        assert (PROJECT_ROOT / "scrapers" / "base.py").is_file()

    def test_scrapers_has_database_module(self):
        """scrapers should have database.py for shared DB connection."""
        assert (PROJECT_ROOT / "scrapers" / "database.py").is_file()

    def test_scrapers_has_utils_module(self):
        """scrapers should have utils.py for helper functions."""
        assert (PROJECT_ROOT / "scrapers" / "utils.py").is_file()


class TestBaseScraper:
    """Tests for BaseScraper abstract class."""

    def test_base_scraper_importable(self):
        """BaseScraper should be importable."""
        from scrapers.base import BaseScraper
        assert BaseScraper is not None

    def test_base_scraper_is_abstract(self):
        """BaseScraper should be an abstract class."""
        from scrapers.base import BaseScraper
        from abc import ABC
        assert issubclass(BaseScraper, ABC)

    def test_base_scraper_has_scrape_method(self):
        """BaseScraper should define abstract scrape() method."""
        from scrapers.base import BaseScraper
        assert hasattr(BaseScraper, 'scrape')

    def test_base_scraper_has_parse_method(self):
        """BaseScraper should define abstract parse() method."""
        from scrapers.base import BaseScraper
        assert hasattr(BaseScraper, 'parse')

    def test_base_scraper_has_save_jobs_method(self):
        """BaseScraper should have save_jobs() method for DB persistence."""
        from scrapers.base import BaseScraper
        assert hasattr(BaseScraper, 'save_jobs')


class TestDuplicateDetection:
    """Tests for job deduplication functionality."""

    def test_generate_job_hash_exists(self):
        """utils.py should have generate_job_hash function."""
        from scrapers.utils import generate_job_hash
        assert callable(generate_job_hash)

    def test_generate_job_hash_returns_string(self):
        """generate_job_hash should return a string hash."""
        from scrapers.utils import generate_job_hash
        result = generate_job_hash("Backend Developer", "TechCorp")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_generate_job_hash_is_consistent(self):
        """Same input should always produce same hash."""
        from scrapers.utils import generate_job_hash
        hash1 = generate_job_hash("Backend Developer", "TechCorp")
        hash2 = generate_job_hash("Backend Developer", "TechCorp")
        assert hash1 == hash2

    def test_generate_job_hash_differs_for_different_input(self):
        """Different input should produce different hash."""
        from scrapers.utils import generate_job_hash
        hash1 = generate_job_hash("Backend Developer", "TechCorp")
        hash2 = generate_job_hash("Frontend Developer", "TechCorp")
        hash3 = generate_job_hash("Backend Developer", "OtherCorp")
        assert hash1 != hash2
        assert hash1 != hash3

    def test_is_duplicate_job_exists(self):
        """utils.py should have is_duplicate_job function."""
        from scrapers.utils import is_duplicate_job
        assert callable(is_duplicate_job)


class TestBatchDuplicateFiltering:
    """Tests for batch duplicate filtering helper."""

    def test_filter_duplicate_jobs_batch_exists(self):
        """utils.py should have filter_duplicate_jobs_batch function."""
        from scrapers.utils import filter_duplicate_jobs_batch

        assert callable(filter_duplicate_jobs_batch)

    def test_filter_duplicate_jobs_batch_filters_out_existing(self, monkeypatch):
        """filter_duplicate_jobs_batch should remove jobs whose external_id already exists."""
        from types import SimpleNamespace
        from scrapers.utils import filter_duplicate_jobs_batch

        # Prepare fake jobs with external_id precomputed
        jobs = [
            {"title": "Backend Dev", "company": "TechCorp", "external_id": "hash1"},
            {"title": "Frontend Dev", "company": "TechCorp", "external_id": "hash2"},
        ]

        # Fake DB rows: only hash1 exists in DB
        existing_rows = [SimpleNamespace(external_id="hash1")]

        class FakeResult:
            def all(self):
                return existing_rows

        class FakeSession:
            def exec(self, _statement):
                return FakeResult()

        fake_session = FakeSession()

        # Call helper
        filtered = filter_duplicate_jobs_batch(fake_session, jobs, source="PRACTICAS_PE")

        # Should keep only the job whose external_id is not in existing_rows
        assert len(filtered) == 1
        assert filtered[0]["external_id"] == "hash2"


class TestScrapersDatabase:
    """Tests for scrapers database connection."""

    def test_scrapers_database_has_engine(self):
        """scrapers/database.py should export engine."""
        from scrapers.database import engine
        assert engine is not None

    def test_scrapers_database_has_get_session(self):
        """scrapers/database.py should export get_session."""
        from scrapers.database import get_session
        assert callable(get_session)

    def test_scrapers_can_import_job_model(self):
        """scrapers should be able to import Job model."""
        from scrapers.database import Job
        assert Job is not None
