# Scrapers AGENTS.md

**Generated:** 2026-04-27

## OVERVIEW

Standalone BeautifulSoup/Playwright scrapers that write directly to the shared database. Each scraper runs independently with fault isolation.

## STRUCTURE

```
scrapers/
├── base.py              # Abstract base class with DB access
├── database.py          # DB connection (imports backend models)
├── utils.py             # Hash generation, dedup helpers
├── orchestrator.py      # APScheduler (24h) + fault isolation runner
├── practicas_pe.py      # BeautifulSoup scraper
├── computrabajo.py      # Playwright scraper
├── requirements-*.txt   # Per-scraper dependencies
└── tests/
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Base class | `scrapers/base.py` | `BaseScraper` with `scrape()`, `parse()`, `save_jobs()` |
| DB access | `scrapers/database.py` | Imports `Job`, `JobSource`, `JobStatus` from backend models |
| Deduplication | `scrapers/utils.py` | `generate_job_hash(title, company)` |
| Scheduling | `scrapers/orchestrator.py` | `ScraperOrchestrator` with APScheduler |
| Site scraper | `scrapers/practicas_pe.py` | BeautifulSoup implementation |
| Site scraper | `scrapers/computrabajo.py` | Playwright implementation |

## CONVENTIONS

- **UV only**: `uv sync`, `uv run` for all Python operations
- **TDD mandatory**: Write tests before implementing scraper logic
- **Required fields**: `title`, `company`, `location`, `url`, `description`, `raw_html`, `status=NEW`
- **Deduplication**: Hash of `(title + company)` via `generate_job_hash()`
- **Fault isolation**: One scraper failure does NOT affect others
- **Write-only**: No HTTP calls to backend API; direct DB writes via `scrapers/database.py`
- **Logging**: Use `self.logger` from `BaseScraper`; include source label in all messages

## ANTI-PATTERNS

1. **Dual scheduling** — APScheduler (24h in orchestrator) + Docker profiles (on-demand). Use Docker profile only; do NOT start APScheduler in Docker.
2. **Import from backend app** — `scrapers/database.py` imports models, but site scrapers must NOT import from `backend/app/` directly.
3. **Blocking sync DB writes** — All DB operations are synchronous; keep them outside async event loops where possible.