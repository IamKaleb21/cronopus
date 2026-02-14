import logging
import asyncio
import json
import re
from typing import List, Dict, Any, Optional
from scrapers.base import BaseScraper
from scrapers.database import JobSource, Job

class CompuTrabajoScraper(BaseScraper):
    """
    Scraper for CompuTrabajo Peru using Playwright.
    Handles dynamic content and potential anti-bot headers.
    """
    
    # URLs for La Libertad and Lima (Software/Web/Systems/Informatics)
    BASE_URLS = [
        # La Libertad
        "https://pe.computrabajo.com/trabajo-de-desarrollador-en-la-libertad?pubdate=7",
        "https://pe.computrabajo.com/trabajo-de-desarrollador-web-en-la-libertad?pubdate=7",
        "https://pe.computrabajo.com/trabajo-de-ingenieria-de-sistemas-en-la-libertad?pubdate=7",
        "https://pe.computrabajo.com/empleos-de-informatica-y-telecom-en-la-libertad?pubdate=7",
        # Lima
        "https://pe.computrabajo.com/trabajo-de-desarrollador-en-lima?pubdate=7",
        "https://pe.computrabajo.com/trabajo-de-desarrollador-web-en-lima?pubdate=7",
        "https://pe.computrabajo.com/trabajo-de-ingenieria-de-sistemas-en-lima?pubdate=7",
        "https://pe.computrabajo.com/empleos-de-informatica-y-telecom-en-lima?pubdate=7",
    ]
    # Keep specific filter for backwards compatibility if needed, or just use first
    BASE_URL = BASE_URLS[0]
    
    def __init__(self):
        super().__init__(source=JobSource.COMPUTRABAJO)
        self.logger = logging.getLogger(__name__)
        
    async def scrape(self, max_pages: int = 5) -> str:
        """
        Scrapes job listings using Playwright.
        Returns a JSON string containing the list of jobs.
        """
        from playwright.async_api import async_playwright
        
        all_jobs = []
        try:
            async with async_playwright() as p:
                # Launch browser
                # Use Chromium as it's standard for Playwright
                browser = await p.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-setuid-sandbox']
                )
                
                try:
                    # Create context with realistic User Agent
                    context = await browser.new_context(
                        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                        viewport={'width': 1280, 'height': 800}
                    )
                    
                    page = await context.new_page()

                    # Optimize: Block unnecessary resources
                    excluded_resources = ["image", "stylesheet", "font", "media", "imageset"]
                    await page.route("**/*", lambda route: route.abort() if route.request.resource_type in excluded_resources else route.continue_())
                    
                    # 1. Discovery Phase: Collect candidate jobs from list pages
                    for base_url in self.BASE_URLS:
                        self.logger.info(f"Navigating to {base_url}")
                        try:
                            await page.goto(base_url, timeout=60000, wait_until='domcontentloaded')
                            
                            # Wait for job cards to load
                            try:
                                await page.wait_for_selector('article.box_offer', timeout=15000)
                            except Exception as e:
                                self.logger.warning(f"Timeout waiting for job cards at {base_url}: {e}")
                                continue
                            
                            # Pagination Loop (Max pages per URL)
                            for i in range(max_pages):
                                self.logger.info(f"Scraping page {i+1} of {base_url}")
                                
                                # Scroll to bottom to trigger any lazy loading
                                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                                await page.wait_for_timeout(1000)
                                
                                # Parse candidates from current page
                                content = await page.content()
                                page_jobs = self._parse_list_page(content)
                                
                                # Add new candidates (checking for duplicates within this run)
                                seen_urls = {j['url'] for j in all_jobs}
                                for job in page_jobs:
                                    if job['url'] not in seen_urls:
                                        all_jobs.append(job)
                                        seen_urls.add(job['url'])
                                
                                # Cerrar banner de cookies antes de verificar paginación
                                await self._close_cookie_banner(page)
                                
                                # Verificar si el botón está habilitado
                                if await self._is_next_button_enabled(page):
                                    try:
                                        next_btn = page.locator('span', has_text='Siguiente')
                                        await next_btn.click(timeout=30000)
                                        await page.wait_for_load_state('networkidle', timeout=10000)
                                    except Exception as click_err:
                                        self.logger.warning(f"Failed to click next: {click_err}")
                                        break
                                else:
                                    self.logger.info("Next button is disabled or not found, stopping pagination.")
                                    break
                        except Exception as url_err:
                            self.logger.error(f"Error scraping {base_url}: {url_err}")
                            continue

                    # Before fetching details, filter out jobs that already exist in DB
                    self.logger.info(f"Found {len(all_jobs)} candidate jobs. Checking duplicates...")
                    all_jobs = self.filter_duplicates(all_jobs)
                    self.logger.info(f"After duplicate check: {len(all_jobs)} new jobs. Fetching details...")

                    # 2. Detail Phase: Fetch full description for each (non-duplicate) job
                    for i, job in enumerate(all_jobs):
                        if not job.get('url'):
                            continue
                        
                        try:
                            self.logger.info(f"Fetching details ({i+1}/{len(all_jobs)}): {job['url']}")
                            await page.goto(job['url'], timeout=30000, wait_until='domcontentloaded')
                            
                            # PRIMARY: JSON-LD extraction (fast, no full HTML parsing)
                            full_desc = await self._extract_description_from_jsonld(page)
                            
                            # FALLBACK: CSS selector extraction
                            if not full_desc:
                                self.logger.debug(f"JSON-LD not found, using CSS fallback for: {job['url']}")
                                content = await page.content()
                                full_desc = self._parse_detail_page(content)
                            
                            if full_desc:
                                job['description'] = full_desc
                            
                            # Random delay to be polite
                            import random
                            await asyncio.sleep(random.uniform(0.5, 1.5))
                            
                        except Exception as e:
                            self.logger.warning(f"Failed to fetch details for {job['url']}: {e}")
                            # Keep partial data if detail fetch fails

                finally:
                    await browser.close()
                    
        except Exception as e:
            self.logger.error(f"Playwright fatal error: {e}")
            
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
        Parses the raw HTML of a list page to extract candidate jobs.
        """
        from bs4 import BeautifulSoup
        
        soup = BeautifulSoup(raw_html, 'html.parser')
        jobs = []
        
        cards = soup.select('article.box_offer')
        
        for card in cards:
            try:
                # Extract Title and URL
                title_elem = card.select_one('h2 a.js-o-link')
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                url = title_elem.get('href', '')
                if url and not url.startswith('http'):
                    url = f"https://pe.computrabajo.com{url}"
                
                # Extract Company
                company_elem = card.select_one('p a.t_ellipsis')
                company = company_elem.get_text(strip=True) if company_elem else "Confidencial"
                
                # Extract Location
                location = "Desconocido"
                loc_icon = card.select_one('i.icon-location, i.icon-map-marker')
                if loc_icon and loc_icon.find_next_sibling('span'):
                    location = loc_icon.find_next_sibling('span').get_text(strip=True)
                else:
                    ps = card.select('p')
                    for p in ps:
                        text = p.get_text(strip=True)
                        if ',' in text and not re.match(r'^[\d]+[.,][\d]+', text):
                             location = text.split('\n')[0].strip()
                             break
                
                if re.match(r'^[\d.,]+$', location):
                    location = "Desconocido"

                # Extract Salary
                salary = None
                card_text = card.get_text(" ", strip=True)
                # Simple check for salary patterns
                if 'S/' in card_text or 'Sueldo' in card_text:
                     # Try to find specific span
                     for span in card.select('span'):
                        stext = span.get_text(strip=True)
                        if 'S/' in stext or 'Sueldo' in stext:
                            salary = stext
                            break


                if not self._is_relevant(title, company):
                    self.logger.info(f"Skipping irrelevant job: {title} at {company}")
                    continue

                # Temporary description (title) until detail fetch
                description = title 

                job = {
                    'title': title,
                    'company': company,
                    'location': location,
                    'description': description,
                    'salary': salary,
                    'url': url,
                    'raw_html': str(card)[:500] # Truncate for efficiency
                }
                jobs.append(job)
                
            except Exception as e:
                self.logger.warning(f"Error parsing job card: {e}")
                continue
                
        return jobs

    async def _close_cookie_banner(self, page):
        """
        Cierra el banner de cookies si está presente.
        Busca por id="cookie-banner" o selector .cc-window.cc-banner
        """
        try:
            # Buscar banner por id (más específico)
            cookie_banner = page.locator('#cookie-banner')
            if await cookie_banner.count() > 0 and await cookie_banner.is_visible():
                # Buscar botón "Acepto" dentro del banner
                accept_btn = cookie_banner.locator('.cc-btn')
                if await accept_btn.count() > 0:
                    await accept_btn.click(timeout=5000)
                    # Esperar a que el banner desaparezca
                    try:
                        await cookie_banner.wait_for(state='hidden', timeout=3000)
                    except Exception:
                        # Si no desaparece inmediatamente, continuar de todas formas
                        pass
                    self.logger.debug("Cookie banner closed")
        except Exception as e:
            # No crítico si falla, solo log
            self.logger.debug(f"Could not close cookie banner: {e}")

    async def _is_next_button_enabled(self, page) -> bool:
        """
        Verifica si el botón 'Siguiente' está habilitado y disponible.
        Retorna False si está deshabilitado o no existe.
        """
        try:
            next_btn = page.locator('span', has_text='Siguiente')
            if await next_btn.count() == 0:
                return False
            
            # Verificar que está visible
            if not await next_btn.is_visible():
                return False
            
            # Verificar que NO tiene clase 'disabled'
            has_disabled_class = await next_btn.evaluate('el => el.classList.contains("disabled")')
            if has_disabled_class:
                return False
            
            return True
        except Exception as e:
            self.logger.debug(f"Error checking next button: {e}")
            return False

    def _is_relevant(self, title: str, company: str = "") -> bool:
        """
        Filters out jobs that contain excluded keywords (e.g. Sales, Drivers)
        unless they also contain strong tech keywords.
        """
        title_lower = title.lower()
        
        # 1. Immediate disqualify keywords (High confidence non-tech)
        # Patterns often used in mass-hiring sales/manual labor jobs
        spam_keywords = [
            "chamba", "genera ingresos", "ganancias", "sin tope", "comisiones ilimitadas",
            "ingresos semanales", "pagos semanales", "entrevista", "urgente", 
            "convocatoria", "multimarca", "consumo masivo", "campaña"
        ]
        
        for kw in spam_keywords:
            # Check if these appear alongside generic terms, or just standalone.
            # "Urgente" might appear in dev jobs ("Urgente Desarrollador Java"), so be careful.
            # But "Genera ingresos", "Chamba", "Sin tope" are almost 100% sales/spam.
            if kw in title_lower:
                # Exception: "Urgente" might be valid if it has "Desarrollador"
                if kw == "urgente":
                    continue
                return False

        # 2. Specific Roles to Exclude
        roles_to_exclude = [
            "asesor de ventas", "ejecutivo de ventas", "agente de ventas", "representante de ventas",
            "vendedor", "promotor", "impulsador", "mercaderista", "preventista",
            "supervisor de ventas", "jefe de ventas", "asesor comercial", "ejecutivo comercial",
            "gestor comercial", "asesor de credito", "asesor de negocios", "fuerza de ventas",
            "ventas de campo", "ventas campo", "ventas corporativas", "telemarketing", "ejecutivo corporativo",
            "chofer", "conductor", "motorizado", "repartidor",
            "almacen", "almacenero", "auxiliar de almacen", "logistica", "logística", "operario", "estibador",
            "mozo", "azafata", "cocinero", "chef", "barista", "mesero",
            "limpieza", "mantenimiento", "servicios generales", "oficios varios",
            "seguridad", "vigilante", "prevencionista",
            "cajero", "atención al cliente", "recepcionista", "call center", "teleoperador",
            "reclutamiento", "recursos humanos", "talento humano", "psicologo", "seleccion",
            "mecánico", "mecanico", "eléctrico", "electrico", "electrónico", "electronico", "técnico de soporte",
            "fibra óptica", "fibra optica", "soporte técnico", "soporte tecnico",
            "especialista de empresas",
            # Administrative / Accounting
            "asistente administrativo", "auxiliar administrativo", "secretaria", "recepcionista", 
            "contador", "asistente contable", "auxiliar contable", "tesoreria", "finanzas",
            "abogado", "legal",
            # Marketing / Design (Non-Tech)
            "community manager", "diseñador gráfico", "disenador grafico", "social media", "redactor", "copywriter",
            # Trade / Production
            "operario de producción", "operario de produccion", "ayudante de producción", "ayudante de produccion",
            "tornero", "soldador", "gasfitero", "pintor", "albanil", "albañil",
            # Health / Education
            "profesor", "docente", "tutor", "medico", "médico", "enfermero", "enfermera", "odontologo", "nutricionista", "farmaceutico",
            # Non-IT Engineering / Construction
            "ingeniero civil", "ingeniero industrial", "ingeniero de minas", "ingeniero agricola", "ingeniero ambiental", 
            "arquitecto de interiores", "dibujante cad", "cadista", "topografo"
        ]
        
        for role in roles_to_exclude:
            if role in title_lower:
                return False

        # 3. Company Filtering
        companies_to_exclude = [
            "covisian perú", "covisian",
            "transagui"
        ]
        company_lower = company.lower()
        for bad_company in companies_to_exclude:
            if bad_company in company_lower:
                return False
                
        # 3. stricter "Ventas" check
        # If "Ventas" appears, it MUST be accompanied by a tech keyword to be valid.
        # e.g. "Ventas de Software" (Sales) vs "Desarrollador de sistema de Ventas" (Dev)
        if "ventas" in title_lower or "comercial" in title_lower:
            tech_keywords = [
                "desarrollador", "programador", "developer", "architect", "ingeniero", 
                "analista", "software", "sistemas", "informatica", "tecnologia", "tech",
                "backend", "frontend", "fullstack", "java", "python", "react", "angular",
                "net", "c#", "php", "sql", "cloud", "aws", "azure", "devops"
            ]
            
            has_tech_keyword = any(tk in title_lower for tk in tech_keywords)
            
            # If it says "Ventas" and has NO tech keyword -> Exclude
            if not has_tech_keyword:
                return False
                
            # Even if it has a tech keyword, check context.
            # "Vendedor de Software" -> Has "Software", but starts with "Vendedor".
            # The role checks above (roles_to_exclude) should catch "Vendedor", "Ejecutivo", etc.
            # But "Asesor Comercial de Software" -> "Asesor Comercial" is excluded above.
            
            # "Especialista en Ventas de TI" -> "Ventas" + "TI". Exclude? Yes, usually sales.
            
        return True

    async def _extract_description_from_jsonld(self, page) -> str:
        """
        Extract job description from JSON-LD (Schema.org JobPosting) embedded in the page.
        This is faster and more reliable than CSS selectors since JSON-LD is structured data.
        Returns cleaned plaintext description or empty string.
        """
        try:
            raw_json = await page.evaluate("""() => {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const script of scripts) {
                    try {
                        const data = JSON.parse(script.innerText);
                        const graph = Array.isArray(data) ? data : (data['@graph'] || [data]);
                        const jobPost = graph.find(item => item['@type'] === 'JobPosting');
                        if (jobPost) return JSON.stringify(jobPost);
                    } catch (e) {}
                }
                return null;
            }""")
            
            if not raw_json:
                return ""
            
            job_posting = json.loads(raw_json)
            html_description = job_posting.get('description', '')
            
            if not html_description:
                return ""
            
            return self._clean_html_description(html_description)
            
        except Exception as e:
            self.logger.debug(f"JSON-LD extraction failed: {e}")
            return ""

    def _clean_html_description(self, html_desc: str) -> str:
        """
        Convert HTML description from JSON-LD into clean plaintext.
        Preserves logical line breaks from <br>, </p>, </li> tags.
        """
        text = html_desc
        
        # Convert block-level closers and <br> to newlines
        text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'</p>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'</li>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'</div>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'</h[1-6]>', '\n', text, flags=re.IGNORECASE)
        
        # Add bullet for list items
        text = re.sub(r'<li[^>]*>', '• ', text, flags=re.IGNORECASE)
        
        # Strip all remaining HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Decode common HTML entities
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&quot;', '"')
        text = text.replace('&#39;', "'")
        
        # Collapse excessive whitespace and newlines
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n\s*\n', '\n\n', text)
        text = text.strip()
        
        return text

    def _parse_detail_page(self, raw_html: str) -> str:
        """
        Extract full job description from detail page.
        """
        from bs4 import BeautifulSoup
        try:
            soup = BeautifulSoup(raw_html, 'html.parser')
            
            # Selector identified from previous analysis
            description_container = soup.select_one('div[div-link="oferta"]')
            
            if description_container:
                # Remove unwanted elements
                for garbage in description_container.select('.tag, .box_info, h3'):
                     # Keeping tags might be useful for skills, but let's clean up for pure description text
                     # We remove h3 title "Descripción de la oferta" to avoid redundancy
                     garbage.decompose()
                
                # Get text with separator
                text = description_container.get_text(separator='\n', strip=True)
                
                # Clean up multiple newlines
                text = re.sub(r'\\n{3,}', '\\n\\n', text)
                
                return text
            
            # Fallback for "Requerimientos" if separate or other structure
            # The snippet showed "Requerimientos" inside the div[div-link="oferta"], so get_text should cover it.
            
            return ""
        except Exception as e:
            self.logger.warning(f"Failed to parse detail page: {e}")
            return ""
