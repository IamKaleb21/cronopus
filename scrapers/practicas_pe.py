"""
CronOpus Practicas.pe Scraper
Based on PRD V1.4 Section A - Scraper con httpx + BeautifulSoup

Scrapes job listings from Practicas.pe, filters by keywords and location,
and saves to database with duplicate detection.

Real HTML structure (analyzed Feb 2026):
- Job cards: div.bg-white.border-radius-1.p-6.relative
- Company: h3.m-0 a (inner text)
- Title: extracted from WhatsApp share link (text parameter)
- Location: p.text-dark-gray span (first span)
- Salary: p.text-dark-gray span (numeric pattern like S/ X,XXX.XX)
- Description: p.text-dark-gray starting with "Pueden postular:"
- Detail URL: a.btn--mas-informacion href
"""
import httpx
import re
import json
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from urllib.parse import unquote
import logging

from scrapers.base import BaseScraper
from scrapers.database import JobSource
from scrapers.utils import sanitize_text


class PracticasPeScraper(BaseScraper):
    """
    Scraper for Practicas.pe job listings.
    
    Uses httpx for async HTTP requests and BeautifulSoup for parsing.
    Filters jobs by tech-related keywords and Lima/Remoto locations.
    """
    
    # Configuration - Multiple URLs for different departments
    # departamento=13 = La Libertad, departamento=15 = Lima
    BASE_URLS = [
        "https://www.practicas.pe/profesionales.php?departamento=13",  # La Libertad (primary)
        "https://www.practicas.pe/profesionales.php?departamento=15",  # Lima
    ]
    BASE_URL = BASE_URLS[0]  # For backwards compatibility with tests
    
    # Tech-related keywords for filtering (per PRD user stories)
    # Note: Keywords must be specific to avoid false positives (e.g., 'ingeniero' alone matches 'Ingeniero Agrónomo')
    KEYWORDS = [
        # Programming languages & frameworks
        'python', 'javascript', 'typescript', 'react', 'node', 'java', 'sql',
        # Roles
        'backend', 'frontend', 'fullstack', 'full stack', 'developer', 'desarrollador', 'programador',
        # Tech fields (specific)
        'ingeniería de sistemas', 'ingeniero de sistemas', 'ingeniería informática', 
        'ingeniero informático', 'ingeniería de software', 'ciencias de la computación',
        'computación e informática', 'ingeniería de computación',
        # Data & AI
        'data science', 'ciencia de datos', 'machine learning', 'inteligencia artificial',
        'análisis de datos', 'estadística',
        # Infrastructure
        'devops', 'cloud', 'aws', 'azure',
    ]
    
    # Valid locations (user is from La Libertad, also interested in Lima)
    VALID_LOCATIONS = ['la libertad', 'trujillo', 'lima', 'remoto', 'remote', 'híbrido', 'hibrido']
    
    # Pagination limit to avoid overloading
    MAX_PAGES = 5
    
    def __init__(self):
        super().__init__(source=JobSource.PRACTICAS_PE)
        self.logger = logging.getLogger(__name__)
    
    async def scrape(self) -> str:
        """
        Fetch job listings and full descriptions from Practicas.pe.
        
        Process:
        1. Fetch all list pages to get candidates.
        2. Filter candidates by keywords/location.
        3. Fetch detail pages for candidates to get full description.
        4. Return JSON string of all jobs.
        """
        all_jobs = []
        
        async with httpx.AsyncClient(
            timeout=30.0,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-PE,es;q=0.9,en;q=0.8',
            }
        ) as client:
            # 1. Fetch list pages
            for base_url in self.BASE_URLS:
                for page in range(1, self.MAX_PAGES + 1):
                    url = f"{base_url}&page={page}"
                    try:
                        self.logger.info(f"Fetching list page: {url}")
                        response = await client.get(url)
                        response.raise_for_status()
                        
                        # Parse jobs from list page
                        page_jobs = self._parse_list_page(response.text)
                        
                        # Filter candidates immediately to avoid fetching unnecessary details
                        for job in page_jobs:
                            if self._passes_filters(job):
                                all_jobs.append(job)
                        
                        # Small delay between list pages
                        import asyncio
                        await asyncio.sleep(0.5)
                        
                    except Exception as e:
                        self.logger.warning(f"Failed to fetch list page {url}: {e}")
            
            # Filter out duplicates before fetching detail pages
            self.logger.info(f"Found {len(all_jobs)} candidate jobs. Checking duplicates...")
            all_jobs = self.filter_duplicates(all_jobs)
            self.logger.info(f"After duplicate check: {len(all_jobs)} new jobs. Fetching details...")
            
            # 2. Fetch detail pages for candidates (only non-duplicates)
            for i, job in enumerate(all_jobs):
                if not job.get('url'):
                    continue
                    
                try:
                    self.logger.info(f"Fetching details ({i+1}/{len(all_jobs)}): {job['url']}")
                    response = await client.get(job['url'])
                    response.raise_for_status()
                    
                    full_description = self._parse_detail_page(response.text)
                    if full_description:
                        job['description'] = full_description
                    
                    # Small delay between detail pages
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    self.logger.warning(f"Failed to fetch details for {job['url']}: {e}")
        
        return json.dumps(all_jobs, indent=4, ensure_ascii=False)
    
    def parse(self, raw_data: str) -> List[Dict[str, Any]]:
        """
        Parse job listings from JSON string (output of scrape).
        """
        try:
            return json.loads(raw_data)
        except json.JSONDecodeError:
            self.logger.error("Failed to parse JSON data")
            return []
            
    def _parse_list_page(self, raw_html: str) -> List[Dict[str, Any]]:
        """
        Parse job listings from search results page.
        Extracts title, company, url, and basic metadata.
        """
        soup = BeautifulSoup(raw_html, 'html.parser')
        jobs = []
        
        # Real HTML structure uses <article> tags with shadow class
        job_cards = soup.select('article.shadow')
        
        if not job_cards:
            # Fallback selectors
            job_cards = soup.find_all('article', class_=lambda c: c and 'bg-white' in c)
        
        self.logger.info(f"Found {len(job_cards)} job cards on list page")
        
        for card in job_cards:
            try:
                # Extract company and URL from h3 a
                h3_link = card.select_one('h3 a')
                if not h3_link:
                    continue
                
                company = sanitize_text(h3_link.get_text())
                url = h3_link.get('href', '')
                
                # Extract title from URL slug or title attribute
                title_attr = h3_link.get('title', '')
                if title_attr:
                    title = sanitize_text(title_attr.replace('REALIZA TUS PRACTICAS EN -', '').strip())
                else:
                    title = self._extract_title_from_url(url)
                
                # If title is same as company, try URL extraction
                if title.lower() == company.lower():
                    title = self._extract_title_from_url(url)
                
                # Make URL absolute if relative
                if url and not url.startswith('http'):
                    url = f"https://www.practicas.pe{url}"
                
                # Extract location from spans
                location = ''
                location_spans = card.select('span')
                for span in location_spans:
                    text = span.get_text().strip()
                    if any(loc in text.lower() for loc in ['la libertad', 'lima', 'trujillo', 'remoto']):
                        location = sanitize_text(text)
                        break
                
                # Fallback location from URL
                if not location:
                    url_lower = url.lower()
                    if 'la-libertad' in url_lower or 'trujillo' in url_lower:
                        location = 'La Libertad'
                    elif 'lima' in url_lower:
                        location = 'Lima'
                
                # Extract salary if present
                salary = None
                for span in location_spans:
                    text = span.get_text().strip()
                    if re.search(r'S/\s*[\d,\.]+', text):
                        salary = sanitize_text(text)
                        break
                
                # Initial description snippet (for filtering)
                description = ''
                desc_elem = card.select_one('p.text-dark-gray')
                if desc_elem:
                    description = sanitize_text(desc_elem.get_text())

                if not company:
                    continue

                jobs.append({
                    'title': title or company,
                    'company': company,
                    'location': location,
                    'salary': salary,
                    'description': description, # Will be replaced with full description later
                    'url': url,
                    'raw_html': str(card)[:1000]
                })
                
            except Exception as e:
                self.logger.warning(f"Failed to parse job card: {e}")
                continue
                
        return jobs

    def _parse_detail_page(self, raw_html: str) -> str:
        """
        Extract full job description from detail page.
        """
        try:
            soup = BeautifulSoup(raw_html, 'html.parser')
            
            # Selector identified: article.oferta
            description_container = soup.select_one('article.oferta')
            
            if description_container:
                # Remove unwanted elements like buttons or ads inside
                for garbage in description_container.select('.btn, .ad-container'):
                    garbage.decompose()
                    
                text = description_container.get_text(separator='\n', strip=True)
                return sanitize_text(text)
            
            return ""
        except Exception as e:
            self.logger.warning(f"Failed to parse detail page: {e}")
            return ""
    
    def _extract_title_from_wa_link(self, wa_link) -> str:
        """
        Extract job title from WhatsApp share link.
        
        Format: https://wa.me/?text=Convocatoria para {Title} - {Company}
        """
        href = wa_link.get('href', '')
        if 'text=' not in href:
            return ''
        
        # Extract text parameter
        match = re.search(r'text=([^&]+)', href)
        if not match:
            return ''
        
        text = unquote(match.group(1))
        
        # Remove "Convocatoria para " prefix if present
        text = re.sub(r'^Convocatoria\s+para\s+', '', text, flags=re.IGNORECASE)
        
        # Remove company suffix after last " - "
        if ' - ' in text:
            text = text.rsplit(' - ', 1)[0]
        
        return sanitize_text(text)
    
    def _extract_title_from_url(self, url: str) -> str:
        """
        Extract job title from detail page URL slug.
        
        Format: /oferta-convocatoria-{title-slug}-{company}-{location}-{id}.html
        """
        # Remove extension and extract slug
        slug = re.sub(r'\.html$', '', url)
        slug = slug.split('/')[-1]
        
        # Remove common prefixes
        slug = re.sub(r'^oferta-convocatoria-', '', slug)
        
        # Remove trailing ID (numbers at the end)
        slug = re.sub(r'-\d+$', '', slug)
        
        # Convert dashes to spaces and title case
        title = slug.replace('-', ' ').title()
        
        return sanitize_text(title)
    
    def _passes_filters(self, job: Dict[str, Any]) -> bool:
        """
        Check if job passes keyword and location filters.
        
        Args:
            job: Job dictionary with title, description, location
            
        Returns:
            True if job should be included, False otherwise.
        """
        # Check location filter (Lima or Remoto only)
        location = job.get('location', '').lower()
        if not any(loc in location for loc in self.VALID_LOCATIONS):
            self.logger.debug(f"Filtered out (location): {job.get('title')}")
            return False
        
        # Check keyword filter (title or description must contain tech keywords)
        searchable = f"{job.get('title', '')} {job.get('description', '')}".lower()
        if not any(keyword in searchable for keyword in self.KEYWORDS):
            self.logger.debug(f"Filtered out (keywords): {job.get('title')}")
            return False
        
        return True
