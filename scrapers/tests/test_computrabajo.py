"""
Test 2.3: CompuTrabajo Scraper Tests
Based on PRD V1.4 Section A - Scraper CompuTrabajo (Playwright)

TDD Strategy:
1. Verify class existence and inheritance.
2. Verify configuration (URL, selectors).
3. Test `_parse_list_page` with mock list HTML.
4. Test `_parse_detail_page` with mock detail HTML.
5. Mock Playwright interactions to test the orchestrated `scrape` flow.
"""
import pytest
import json
from unittest.mock import MagicMock, patch, AsyncMock
from scrapers.base import BaseScraper

class TestCompuTrabajoStructure:
    """Tests for module structure and class inheritance."""

    def test_scraper_file_exists(self):
        """scrapers/computrabajo.py should exist."""
        from pathlib import Path
        scraper_path = Path(__file__).parent.parent / "computrabajo.py"
        assert scraper_path.is_file()

    def test_scraper_importable(self):
        """CompuTrabajoScraper should be importable."""
        from scrapers.computrabajo import CompuTrabajoScraper
        assert CompuTrabajoScraper is not None

    def test_scraper_extends_base(self):
        """CompuTrabajoScraper should extend BaseScraper."""
        from scrapers.computrabajo import CompuTrabajoScraper
        assert issubclass(CompuTrabajoScraper, BaseScraper)

class TestCompuTrabajoConfig:
    """Tests for scraper configuration."""
    
    def test_config_has_url_list(self):
        from scrapers.computrabajo import CompuTrabajoScraper
        scraper = CompuTrabajoScraper()
        assert hasattr(scraper, 'BASE_URLS')
        assert len(scraper.BASE_URLS) >= 8
        # Check for both regions
        urls_str = " ".join(scraper.BASE_URLS)
        assert "la-libertad" in urls_str
        assert "lima" in urls_str
        
    def test_has_legacy_base_url(self):
        """Ensure backward compatibility if attribute is accessed."""
        from scrapers.computrabajo import CompuTrabajoScraper
        scraper = CompuTrabajoScraper()
        assert hasattr(scraper, 'BASE_URL')
        assert scraper.BASE_URL in scraper.BASE_URLS

# --------------- Parser Tests (Mock HTML) ---------------

class TestCompuTrabajoParsingLogic:
    """Tests for parsing logic using mock HTML."""
    
    @pytest.fixture
    def mock_list_html(self):
        """Returns content of the mock list page fixture."""
        from pathlib import Path
        fixture_path = Path(__file__).parent / "fixtures" / "computrabajo_mock.html"
        return fixture_path.read_text(encoding='utf-8')

    def test_parse_list_page_extracts_jobs(self, mock_list_html):
        from scrapers.computrabajo import CompuTrabajoScraper
        scraper = CompuTrabajoScraper()
        
        jobs = scraper._parse_list_page(mock_list_html)
        
        assert len(jobs) == 2
        
        job = jobs[0]
        assert job['title'] == "Programador Java Senior"
        assert job['company'] == "Tech Solutions Peru"
        assert job['location'] == "Trujillo, La Libertad"
        assert job['url'] == "https://pe.computrabajo.com/oferta-de-trabajo/programador-java"
        # Since description is just title placeholder in list page
        assert job['description'] == "Programador Java Senior" 

    def test_parse_detail_page_extracts_description(self):
        from scrapers.computrabajo import CompuTrabajoScraper
        scraper = CompuTrabajoScraper()
        
        mock_detail_html = """
        <html>
            <body>
                <div class="box_detail">
                    <h1>Programador Java</h1>
                    <div div-link="oferta">
                        <p>Somos una empresa lider...</p>
                        <h3>Descripción de la oferta</h3>
                        <p>Buscamos programador Java con experiencia en Spring Boot.</p>
                        <p>Requisitos:</p>
                        <ul>
                            <li>Java 8+</li>
                            <li>SQL</li>
                        </ul>
                    </div>
                </div>
            </body>
        </html>
        """
        
        description = scraper._parse_detail_page(mock_detail_html)
        
        assert "Buscamos programador Java" in description
        assert "Spring Boot" in description
        assert "Java 8+" in description
        assert "SQL" in description
        # Ensure redundant title h3 is removed if logic exists, or just verify content presence
        # My implementation removes 'h3', so "Descripción de la oferta" should NOT be present if it was in h3
        assert "Descripción de la oferta" not in description

    def test_parse_method_handles_json(self):
        """Test that the public parse() method handles JSON strings correctly."""
        from scrapers.computrabajo import CompuTrabajoScraper
        scraper = CompuTrabajoScraper()
        
        mock_data = [{'title': 'Test Job', 'url': 'http://example.com'}]
        json_str = json.dumps(mock_data)
        
        result = scraper.parse(json_str)
        assert result == mock_data
        assert result[0]['title'] == 'Test Job'

# --------------- Scraper Tests (Mock Playwright) ---------------

class TestCompuTrabajoScrape:
    """Tests for scrape() method using mocked Playwright."""
    
    @pytest.mark.asyncio
    async def test_scrape_flow(self):
        """
        Test the full scrape flow: 
        1. Navigate to list page
        2. Parse candidates
        3. Navigate to detail page
        4. Extract description
        5. Return JSON
        """
        from scrapers.computrabajo import CompuTrabajoScraper
        
        scraper = CompuTrabajoScraper()
        # Reduce to 1 URL to speed up test
        scraper.BASE_URLS = ["https://mock.url/list"]
        
        with patch('playwright.async_api.async_playwright') as mock_ap_ctx:
            # Mock objects
            mock_playwright = AsyncMock()
            mock_browser = AsyncMock()
            mock_context = AsyncMock()
            mock_page = AsyncMock()
            
            # Setup Context Manager
            mock_ap_ctx.return_value.__aenter__.return_value = mock_playwright
            
            # Browser Launch
            mock_playwright.chromium.launch.return_value = mock_browser
            mock_browser.new_context.return_value = mock_context
            mock_context.new_page.return_value = mock_page
            
            # Mock Page Content Responses
            # We need to simulate:
            # 1. List Page (contains 1 job)
            # 2. Detail Page (for that job)
            
            list_html = """
            <article class="box_offer">
                <h2 class="fs18"><a href="/job/1" class="js-o-link">Job 1</a></h2>
                <p class="fs13">Hace 1 hora</p>
            </article>
            """
            
            detail_html = """
            <div div-link="oferta">
                <p>Full Description Here</p>
            </div>
            """
            
            # Configure mock_page.content to return list_html first, then detail_html
            # But wait, scrape loops. 
            # It calls content() inside the pagination loop.
            # Then it calls content() again inside the detail loop.
            
            # Let's mock side_effect for content()
            # We assume 1 list page (loop 0), then 1 detail page.
            mock_page.content.side_effect = [
                list_html,      # List page 1
                detail_html     # Detail page for Job 1
            ]
            
            # Mock Next button to not be found/visible so pagination loop breaks early
            mock_next = AsyncMock()
            mock_next.count.return_value = 0 
            mock_page.locator.return_value = mock_next

            # Execute
            json_result = await scraper.scrape()
            
            # Verification
            result = json.loads(json_result)
            assert len(result) == 1
            assert result[0]['title'] == "Job 1"
            assert result[0]['description'] == "Full Description Here"
            
            # Verify Navigations
            # 1. Base URL
            # 2. Job URL
            assert mock_page.goto.call_count >= 2
            # Check arguments
            print(mock_page.goto.call_args_list) # Debug info if fail

    @pytest.mark.asyncio
    async def test_scrape_uses_filter_duplicates_before_details(self):
        """
        scrape() should call filter_duplicates() so that only
        non-duplicate jobs go through the detail navigation phase.
        We simulate this by having two list jobs but forcing
        filter_duplicates() to keep only one; then we assert that
        only one detail navigation happens (1 base_url + 1 detail).
        """
        from scrapers.computrabajo import CompuTrabajoScraper

        scraper = CompuTrabajoScraper()
        # Reduce to 1 URL to speed up test
        scraper.BASE_URLS = ["https://mock.url/list"]

        # Monkeypatch filter_duplicates on this instance to keep only first job
        original_filter = getattr(scraper, "filter_duplicates", None)

        def fake_filter(jobs):
            return jobs[:1]

        scraper.filter_duplicates = fake_filter

        # Also short-circuit detail parsing to avoid reliance on page.content()
        # and focus the test on navigation count.
        from unittest.mock import AsyncMock as _AsyncMock  # avoid confusion with top-level
        scraper._extract_description_from_jsonld = _AsyncMock(return_value="Full Description")

        with patch("playwright.async_api.async_playwright") as mock_ap_ctx:
            # Mock objects
            mock_playwright = AsyncMock()
            mock_browser = AsyncMock()
            mock_context = AsyncMock()
            mock_page = AsyncMock()

            # Setup Context Manager
            mock_ap_ctx.return_value.__aenter__.return_value = mock_playwright

            # Browser Launch
            mock_playwright.chromium.launch.return_value = mock_browser
            mock_browser.new_context.return_value = mock_context
            mock_context.new_page.return_value = mock_page

            # List HTML with TWO jobs
            list_html = """
            <article class="box_offer">
                <h2 class="fs18"><a href="/job/1" class="js-o-link">Job 1</a></h2>
                <p class="fs13">Hace 1 hora</p>
            </article>
            <article class="box_offer">
                <h2 class="fs18"><a href="/job/2" class="js-o-link">Job 2</a></h2>
                <p class="fs13">Hace 2 horas</p>
            </article>
            """

            # content() is called once in the discovery phase for the list page
            mock_page.content.side_effect = [list_html]

            # Mock Next button to not be found/visible so pagination stops
            mock_next = AsyncMock()
            mock_next.count.return_value = 0
            mock_page.locator.return_value = mock_next

            try:
                json_result = await scraper.scrape(max_pages=1)
                data = json.loads(json_result)

                # After filter_duplicates(), we should end up with only one job persisted in the JSON
                assert len(data) == 1
                assert data[0]["title"] == "Job 1"

                # Goto should be called exactly twice:
                # 1) once for the list URL, 2) once for the single remaining detail URL
                assert mock_page.goto.call_count == 2
            finally:
                if original_filter is not None:
                    scraper.filter_duplicates = original_filter

# --------------- Pagination Tests (Cookie Banner & Disabled Button) ---------------

class TestCompuTrabajoPaginationHelpers:
    """Tests for pagination helper methods: cookie banner and disabled button detection."""
    
    @pytest.mark.asyncio
    async def test_close_cookie_banner_closes_banner(self):
        """Test that _close_cookie_banner() finds and clicks the accept button."""
        from scrapers.computrabajo import CompuTrabajoScraper
        
        scraper = CompuTrabajoScraper()
        mock_page = AsyncMock()
        
        # Mock accept button inside banner
        mock_accept_btn = AsyncMock()
        mock_accept_btn.count = AsyncMock(return_value=1)
        mock_accept_btn.click = AsyncMock()
        
        # Mock cookie banner locator
        mock_banner = AsyncMock()
        mock_banner.count = AsyncMock(return_value=1)
        mock_banner.is_visible = AsyncMock(return_value=True)
        # When banner.locator('.cc-btn') is called, return the accept button
        mock_banner.locator = MagicMock(return_value=mock_accept_btn)
        
        # Setup locator chain: page.locator('#cookie-banner').locator('.cc-btn')
        mock_page.locator = MagicMock(return_value=mock_banner)
        
        # Execute
        await scraper._close_cookie_banner(mock_page)
        
        # Verify banner was found
        mock_page.locator.assert_called_with('#cookie-banner')
        # Verify accept button locator was called
        mock_banner.locator.assert_called_with('.cc-btn')
        # Verify accept button was clicked
        mock_accept_btn.click.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_close_cookie_banner_handles_missing_banner(self):
        """Test that _close_cookie_banner() handles missing banner gracefully."""
        from scrapers.computrabajo import CompuTrabajoScraper
        
        scraper = CompuTrabajoScraper()
        mock_page = AsyncMock()
        
        # Mock banner not found
        mock_banner = AsyncMock()
        mock_banner.count = AsyncMock(return_value=0)
        mock_page.locator.return_value = mock_banner
        
        # Execute - should not raise exception
        await scraper._close_cookie_banner(mock_page)
        
        # Verify banner was checked
        mock_page.locator.assert_called_with('#cookie-banner')
    
    @pytest.mark.asyncio
    async def test_is_next_button_enabled_returns_true_when_enabled(self):
        """Test that _is_next_button_enabled() returns True for enabled button."""
        from scrapers.computrabajo import CompuTrabajoScraper
        
        scraper = CompuTrabajoScraper()
        mock_page = AsyncMock()
        
        # Mock enabled button (no 'disabled' class)
        mock_next_btn = AsyncMock()
        mock_next_btn.count = AsyncMock(return_value=1)
        mock_next_btn.is_visible = AsyncMock(return_value=True)
        mock_next_btn.evaluate = AsyncMock(return_value=False)  # No 'disabled' class
        
        # Use MagicMock for locator to handle has_text parameter
        mock_page.locator = MagicMock(return_value=mock_next_btn)
        
        # Execute
        result = await scraper._is_next_button_enabled(mock_page)
        
        # Verify
        assert result is True
        mock_next_btn.evaluate.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_is_next_button_enabled_returns_false_when_disabled(self):
        """Test that _is_next_button_enabled() returns False for disabled button."""
        from scrapers.computrabajo import CompuTrabajoScraper
        
        scraper = CompuTrabajoScraper()
        mock_page = AsyncMock()
        
        # Mock disabled button (has 'disabled' class)
        mock_next_btn = AsyncMock()
        mock_next_btn.count = AsyncMock(return_value=1)
        mock_next_btn.is_visible = AsyncMock(return_value=True)
        mock_next_btn.evaluate = AsyncMock(return_value=True)  # Has 'disabled' class
        
        # Use MagicMock for locator to handle has_text parameter
        mock_page.locator = MagicMock(return_value=mock_next_btn)
        
        # Execute
        result = await scraper._is_next_button_enabled(mock_page)
        
        # Verify
        assert result is False
        mock_next_btn.evaluate.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_is_next_button_enabled_returns_false_when_not_found(self):
        """Test that _is_next_button_enabled() returns False when button doesn't exist."""
        from scrapers.computrabajo import CompuTrabajoScraper
        
        scraper = CompuTrabajoScraper()
        mock_page = AsyncMock()
        
        # Mock button not found
        mock_next_btn = AsyncMock()
        mock_next_btn.count = AsyncMock(return_value=0)
        
        # Use MagicMock for locator to handle has_text parameter
        mock_page.locator = MagicMock(return_value=mock_next_btn)
        
        # Execute
        result = await scraper._is_next_button_enabled(mock_page)
        
        # Verify
        assert result is False

class TestCompuTrabajoPaginationIntegration:
    """Integration tests for pagination with cookie banner and disabled button handling."""
    
    @pytest.mark.asyncio
    async def test_pagination_closes_cookie_banner_before_clicking_next(self):
        """Test that pagination closes cookie banner before attempting to click next button."""
        from scrapers.computrabajo import CompuTrabajoScraper
        
        scraper = CompuTrabajoScraper()
        scraper.BASE_URLS = ["https://mock.url/list"]
        
        with patch('playwright.async_api.async_playwright') as mock_ap_ctx:
            # Setup mocks
            mock_playwright = AsyncMock()
            mock_browser = AsyncMock()
            mock_context = AsyncMock()
            mock_page = AsyncMock()
            
            mock_ap_ctx.return_value.__aenter__.return_value = mock_playwright
            mock_playwright.chromium.launch.return_value = mock_browser
            mock_browser.new_context.return_value = mock_context
            mock_context.new_page.return_value = mock_page
            
            # Mock list HTML
            list_html = """
            <article class="box_offer">
                <h2 class="fs18"><a href="/job/1" class="js-o-link">Job 1</a></h2>
            </article>
            """
            mock_page.content.return_value = list_html
            
            # Mock accept button inside banner
            mock_accept_btn = AsyncMock()
            mock_accept_btn.count = AsyncMock(return_value=1)
            mock_accept_btn.click = AsyncMock()
            
            # Mock cookie banner
            mock_banner = AsyncMock()
            mock_banner.count = AsyncMock(return_value=1)
            mock_banner.is_visible = AsyncMock(return_value=True)
            mock_banner.wait_for = AsyncMock()  # For wait_for(state='hidden')
            mock_banner.locator = MagicMock(return_value=mock_accept_btn)
            
            # Mock next button (enabled)
            mock_next_btn = AsyncMock()
            mock_next_btn.count = AsyncMock(return_value=1)
            mock_next_btn.is_visible = AsyncMock(return_value=True)
            mock_next_btn.evaluate = AsyncMock(return_value=False)  # Not disabled
            mock_next_btn.click = AsyncMock()
            
            # Setup locator to return different mocks based on selector
            def locator_side_effect(selector, **kwargs):
                if selector == '#cookie-banner':
                    return mock_banner
                elif 'Siguiente' in str(selector) or kwargs.get('has_text') == 'Siguiente':
                    return mock_next_btn
                return AsyncMock()
            
            mock_page.locator = MagicMock(side_effect=locator_side_effect)
            
            # Mock wait_for_load_state for pagination
            mock_page.wait_for_load_state = AsyncMock()
            
            # Execute
            await scraper.scrape(max_pages=1)
            
            # Verify cookie banner was closed
            mock_accept_btn.click.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_pagination_stops_when_button_disabled(self):
        """Test that pagination stops gracefully when next button is disabled."""
        from scrapers.computrabajo import CompuTrabajoScraper
        
        scraper = CompuTrabajoScraper()
        scraper.BASE_URLS = ["https://mock.url/list"]
        
        with patch('playwright.async_api.async_playwright') as mock_ap_ctx:
            # Setup mocks
            mock_playwright = AsyncMock()
            mock_browser = AsyncMock()
            mock_context = AsyncMock()
            mock_page = AsyncMock()
            
            mock_ap_ctx.return_value.__aenter__.return_value = mock_playwright
            mock_playwright.chromium.launch.return_value = mock_browser
            mock_browser.new_context.return_value = mock_context
            mock_context.new_page.return_value = mock_page
            
            # Mock list HTML
            list_html = """
            <article class="box_offer">
                <h2 class="fs18"><a href="/job/1" class="js-o-link">Job 1</a></h2>
            </article>
            """
            mock_page.content.return_value = list_html
            
            # Mock cookie banner (not present or already closed)
            mock_banner = AsyncMock()
            mock_banner.count = AsyncMock(return_value=0)
            
            # Mock next button (disabled)
            mock_next_btn = AsyncMock()
            mock_next_btn.count = AsyncMock(return_value=1)
            mock_next_btn.is_visible = AsyncMock(return_value=True)
            mock_next_btn.evaluate = AsyncMock(return_value=True)  # Has 'disabled' class
            mock_next_btn.click = AsyncMock()
            
            # Setup locator
            def locator_side_effect(selector, **kwargs):
                if selector == '#cookie-banner':
                    return mock_banner
                elif 'Siguiente' in str(selector) or kwargs.get('has_text') == 'Siguiente':
                    return mock_next_btn
                return AsyncMock()
            
            mock_page.locator = MagicMock(side_effect=locator_side_effect)
            
            # Execute
            await scraper.scrape(max_pages=1)
            
            # Verify next button click was NOT attempted (button is disabled)
            mock_next_btn.click.assert_not_called()
