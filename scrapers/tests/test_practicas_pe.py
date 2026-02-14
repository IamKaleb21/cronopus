"""
Test 2.2: Practicas.pe Scraper Tests
Based on PRD V1.4 Section A - Scraper Practicas.pe (httpx + BeautifulSoup)

Parser tests use REAL HTML fetched from practicas.pe (cached as fixture).
This ensures selectors always match the actual site structure.

User settings:
- Prácticas PROFESIONALES (not preprofesionales)
- Locations: La Libertad (primary, departamento=13), Lima (departamento=15)
"""
import pytest
import asyncio
import httpx
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock


# --------------- Fixtures: Real HTML ---------------

FIXTURE_DIR = Path(__file__).parent / "fixtures"
FIXTURE_HTML = FIXTURE_DIR / "practicas_pe_real.html"


@pytest.fixture(scope="session", autouse=True)
def fetch_real_html():
    """
    Fetches real HTML from practicas.pe once per test session
    and caches it as a fixture file.
    """
    FIXTURE_DIR.mkdir(exist_ok=True)
    
    # Re-fetch if fixture doesn't exist or is older than 24h
    import time
    should_fetch = not FIXTURE_HTML.exists()
    if FIXTURE_HTML.exists():
        age_hours = (time.time() - FIXTURE_HTML.stat().st_mtime) / 3600
        if age_hours > 24:
            should_fetch = True
    
    if should_fetch:
        try:
            response = httpx.get(
                "https://www.practicas.pe/profesionales.php?departamento=13",
                timeout=30.0,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
            )
            response.raise_for_status()
            FIXTURE_HTML.write_text(response.text, encoding='utf-8')
        except Exception as e:
            if not FIXTURE_HTML.exists():
                pytest.skip(f"Cannot fetch practicas.pe and no cached fixture: {e}")


@pytest.fixture
def real_html():
    """Returns cached real HTML from practicas.pe."""
    if not FIXTURE_HTML.exists():
        pytest.skip("No cached HTML fixture available")
    return FIXTURE_HTML.read_text(encoding='utf-8')


# --------------- Structure Tests ---------------

class TestPracticasPeScraperStructure:
    """Tests for Practicas.pe scraper module structure."""

    def test_practicas_scraper_file_exists(self):
        """scrapers/practicas_pe.py should exist."""
        scraper_path = Path(__file__).parent.parent / "practicas_pe.py"
        assert scraper_path.is_file()

    def test_practicas_scraper_importable(self):
        """PracticasPeScraper should be importable."""
        from scrapers.practicas_pe import PracticasPeScraper
        assert PracticasPeScraper is not None

    def test_practicas_scraper_extends_base(self):
        """PracticasPeScraper should extend BaseScraper."""
        from scrapers.practicas_pe import PracticasPeScraper
        from scrapers.base import BaseScraper
        assert issubclass(PracticasPeScraper, BaseScraper)


# --------------- Parser Tests (Real HTML) ---------------

class TestPracticasPeParser:
    """Tests for parsing REAL HTML from Practicas.pe."""

    def test_parse_returns_list(self, real_html):
        """_parse_list_page() should return a list."""
        from scrapers.practicas_pe import PracticasPeScraper
        scraper = PracticasPeScraper()
        result = scraper._parse_list_page(real_html)
        assert isinstance(result, list)

    def test_parse_extracts_jobs(self, real_html):
        """_parse_list_page() should extract at least 1 job from real HTML."""
        from scrapers.practicas_pe import PracticasPeScraper
        scraper = PracticasPeScraper()
        jobs = scraper._parse_list_page(real_html)
        assert len(jobs) >= 1, "No jobs extracted from real HTML"

    def test_parse_extracts_title(self, real_html):
        """Each job should have a non-empty title."""
        from scrapers.practicas_pe import PracticasPeScraper
        scraper = PracticasPeScraper()
        jobs = scraper._parse_list_page(real_html)
        assert len(jobs) > 0
        assert all(job.get('title') for job in jobs), "Some jobs have empty titles"

    def test_parse_extracts_company(self, real_html):
        """Each job should have a non-empty company."""
        from scrapers.practicas_pe import PracticasPeScraper
        scraper = PracticasPeScraper()
        jobs = scraper._parse_list_page(real_html)
        assert len(jobs) > 0
        assert all(job.get('company') for job in jobs), "Some jobs have empty companies"

    def test_parse_extracts_url(self, real_html):
        """Each job should have a URL pointing to practicas.pe."""
        from scrapers.practicas_pe import PracticasPeScraper
        scraper = PracticasPeScraper()
        jobs = scraper._parse_list_page(real_html)
        assert len(jobs) > 0
        for job in jobs:
            assert job.get('url'), f"Job '{job.get('title')}' has no URL"
            assert 'practicas.pe' in job['url'], f"URL doesn't point to practicas.pe: {job['url']}"

    def test_parse_extracts_description_snippet(self, real_html):
        """Each job from list page should have a description snippet."""
        from scrapers.practicas_pe import PracticasPeScraper
        scraper = PracticasPeScraper()
        jobs = scraper._parse_list_page(real_html)
        assert len(jobs) > 0
        assert all(job.get('description') is not None for job in jobs), "Some jobs have None descriptions"

    def test_parse_extracts_location(self, real_html):
        """Jobs should have location extracted."""
        from scrapers.practicas_pe import PracticasPeScraper
        scraper = PracticasPeScraper()
        jobs = scraper._parse_list_page(real_html)
        assert len(jobs) > 0
        # At least some jobs should have a location
        jobs_with_location = [j for j in jobs if j.get('location')]
        assert len(jobs_with_location) > 0, "No jobs have location extracted"


# --------------- Filter Tests (Real HTML) ---------------

class TestPracticasPeFilters:
    """Tests for keyword and location filtering on real data."""

    def test_filters_only_tech_jobs(self, real_html):
        """All returned jobs should match at least one tech keyword."""
        from scrapers.practicas_pe import PracticasPeScraper
        scraper = PracticasPeScraper()
        jobs = scraper._parse_list_page(real_html)
        
        # We manually filter safely here to test the logic
        filtered_jobs = [j for j in jobs if scraper._passes_filters(j)]
        
        for job in filtered_jobs:
            searchable = f"{job.get('title', '')} {job.get('description', '')}".lower()
            assert any(kw in searchable for kw in scraper.KEYWORDS), \
                f"Job doesn't match any keyword: {job.get('title')}"

    def test_filters_only_valid_locations(self, real_html):
        """All returned jobs should be from valid locations."""
        from scrapers.practicas_pe import PracticasPeScraper
        scraper = PracticasPeScraper()
        jobs = scraper._parse_list_page(real_html)
        
        # We manually filter safely here to test the logic
        filtered_jobs = [j for j in jobs if scraper._passes_filters(j)]
        
        for job in filtered_jobs:
            location = job.get('location', '').lower()
            url = job.get('url', '').lower()
            # Location should match either from extracted text or URL
            has_valid_location = any(
                loc in location or loc in url
                for loc in scraper.VALID_LOCATIONS
            )
            assert has_valid_location, \
                f"Job has invalid location: '{job.get('location')}' - {job.get('title')}"


# --------------- Parser Tests (Detail Page) ---------------

class TestPracticasPeDetailParser:
    """Tests for parsing detail pages."""

    def test_parse_detail_page_extracts_text(self):
        """_parse_detail_page should extract text from article.oferta."""
        from scrapers.practicas_pe import PracticasPeScraper
        scraper = PracticasPeScraper()
        
        html = """
        <html>
            <body>
                <article class="oferta">
                    <h2>Requisitos</h2>
                    <ul>
                        <li>Python</li>
                        <li>SQL</li>
                    </ul>
                    <div class="ad-container">Ad</div>
                    <button class="btn">Apply</button>
                    <p>Some description text.</p>
                </article>
            </body>
        </html>
        """
        
        description = scraper._parse_detail_page(html)
        assert "Requisitos" in description
        assert "Python" in description
        assert "SQL" in description
        assert "Some description text" in description
        assert "Ad" not in description
        assert "Apply" not in description


# --------------- Configuration Tests ---------------

class TestPracticasPeConfiguration:
    """Tests for scraper configuration."""

    def test_scraper_has_base_url(self):
        """Scraper should have BASE_URL configured."""
        from scrapers.practicas_pe import PracticasPeScraper
        scraper = PracticasPeScraper()
        assert hasattr(scraper, 'BASE_URL')
        assert 'practicas' in scraper.BASE_URL.lower()

    def test_scraper_has_multiple_urls(self):
        """Scraper should have BASE_URLS for La Libertad and Lima."""
        from scrapers.practicas_pe import PracticasPeScraper
        scraper = PracticasPeScraper()
        assert hasattr(scraper, 'BASE_URLS')
        assert len(scraper.BASE_URLS) >= 2
        # Check La Libertad (13) and Lima (15)
        urls_joined = ' '.join(scraper.BASE_URLS)
        assert 'departamento=13' in urls_joined
        assert 'departamento=15' in urls_joined


# --------------- HTTP Client Tests ---------------

class TestPracticasPeHttpClient:
    """Tests for HTTP client functionality."""

    @pytest.mark.asyncio
    async def test_scrape_uses_httpx(self):
        """scrape() should use httpx for HTTP requests."""
        from scrapers.practicas_pe import PracticasPeScraper
        
        scraper = PracticasPeScraper()
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.text = "<html></html>"
            mock_response.status_code = 200
            mock_response.raise_for_status = MagicMock()
            
            mock_client_instance = AsyncMock()
            mock_client_instance.get = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_client_instance
            
            result = await scraper.scrape()
            # Should be JSON string now
            assert isinstance(result, str)
            assert mock_client_instance.get.called

    @pytest.mark.asyncio
    async def test_scrape_fetches_details(self):
        """scrape() should fetch detail pages for candidates."""
        from scrapers.practicas_pe import PracticasPeScraper
        
        scraper = PracticasPeScraper()
        scraper.MAX_PAGES = 1
        
        # Mock list page html
        list_html = """
        <article class="shadow">
            <h3><a href="/job1.html">Python Developer</a></h3>
            <span>Lima</span>
            <p class="text-dark-gray">Python...</p>
        </article>
        """
        
        with patch('httpx.AsyncClient') as mock_client:
            # Setup mock responses
            list_response = MagicMock()
            list_response.text = list_html
            list_response.status_code = 200
            
            detail_response = MagicMock()
            detail_response.text = "<html><article class='oferta'>Full Description</article></html>"
            detail_response.status_code = 200
            
            mock_client_instance = AsyncMock()
            # First call (list page), Second call (detail page)
            mock_client_instance.get = AsyncMock(side_effect=[list_response, detail_response, list_response, detail_response]) 
            # Note: side_effect might need more items if BASE_URLS has multiple items
            
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_client_instance
            
            # Reduce BASE_URLS to 1 for this test
            original_urls = scraper.BASE_URLS
            scraper.BASE_URLS = [original_urls[0]]
            
            try:
                result = await scraper.scrape()
                import json
                jobs = json.loads(result)
                
                assert len(jobs) == 1
                assert jobs[0]['description'] == "Full Description"
                # Should call get at least twice (1 list + 1 detail)
                assert mock_client_instance.get.call_count >= 2
                
            finally:
                scraper.BASE_URLS = original_urls

    @pytest.mark.asyncio
    async def test_scrape_uses_filter_duplicates_before_details(self):
        """
        scrape() should call filter_duplicates() and only fetch details
        for the jobs returned by that filter.
        """
        from scrapers.practicas_pe import PracticasPeScraper

        scraper = PracticasPeScraper()
        scraper.MAX_PAGES = 1

        # Two candidate jobs on the list page
        list_html = """
        <article class="shadow">
            <h3><a href="/job1.html" title="Job One">Job One</a></h3>
            <span>Lima</span>
            <p class="text-dark-gray">Python...</p>
        </article>
        <article class="shadow">
            <h3><a href="/job2.html" title="Job Two">Job Two</a></h3>
            <span>Lima</span>
            <p class="text-dark-gray">Python...</p>
        </article>
        """

        with patch("httpx.AsyncClient") as mock_client:
            # Setup mock responses: one list page, then detail page for only one job
            list_response = MagicMock()
            list_response.text = list_html
            list_response.status_code = 200

            detail_response = MagicMock()
            detail_response.text = "<html><article class='oferta'>Full Description</article></html>"
            detail_response.status_code = 200

            mock_client_instance = AsyncMock()
            # First call: list page; Second call: single detail page
            mock_client_instance.get = AsyncMock(side_effect=[list_response, detail_response])
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_client_instance

            # Reduce BASE_URLS to 1 for deterministic behaviour
            original_urls = scraper.BASE_URLS
            scraper.BASE_URLS = [original_urls[0]]

            # Monkeypatch filter_duplicates to simulate one job being a duplicate
            original_filter = getattr(scraper, "filter_duplicates", None)

            def fake_filter(jobs):
                # Keep only the first job as \"new\"
                return jobs[:1]

            scraper.filter_duplicates = fake_filter

            try:
                result = await scraper.scrape()
                import json

                jobs = json.loads(result)

                # Only one job should remain after filter_duplicates()
                assert len(jobs) == 1
                # HTTP client should have been called twice: 1 list + 1 detail
                assert mock_client_instance.get.call_count == 2
            finally:
                scraper.BASE_URLS = original_urls
                if original_filter is not None:
                    scraper.filter_duplicates = original_filter
