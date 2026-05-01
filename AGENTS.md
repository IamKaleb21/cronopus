# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-27
**Commit:** ae5419e
**Branch:** main

## OVERVIEW
Cronopus — Personal job search command center. Automates job detection (scrapers) + AI-powered CV generation (Gemini → Jinja → LaTeX → PDF) with Telegram triage.

## STRUCTURE
```
cronopus/
├── backend/           # FastAPI + SQLModel
│   ├── app/
│   │   ├── main.py    # FastAPI entry point
│   │   ├── models/    # SQLModel models (Job, Template, GeneratedCV)
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── services/  # Business logic (seed, CV generation)
│   │   └── api/       # Route handlers
│   └── tests/
├── frontend/          # React 19 + Vite + TanStack Query + Tailwind
│   └── src/
│       ├── pages/     # Route pages
│       ├── components/# UI components
│       ├── hooks/     # Custom React hooks
│       ├── lib/       # Utilities
│       └── services/  # API client
├── scrapers/          # Standalone BeautifulSoup/Playwright scrapers
│   ├── base.py        # Shared scraper base class
│   ├── practicas_pe.py
│   ├── computrabajo.py
│   └── orchestrator.py
├── telegram-bot/      # python-telegram-bot triage bot
├── scripts/           # Utility scripts (seed, run, clear)
├── docs/              # PRD, design_system, LaTeX template
└── docker-compose.yml
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Backend API | `backend/app/main.py` | FastAPI app, CORS, job endpoints |
| Database models | `backend/app/models/` | SQLModel (Job, Template, GeneratedCV) |
| CV generation | `backend/app/services/cv_generator.py` | Gemini → Jinja → Tectonic → PDF |
| Frontend API layer | `frontend/src/services/api.ts` | Axios + React Query |
| Scraper base | `scrapers/base.py` | Shared scraping logic |
| Telegram bot | `telegram-bot/bot.py` | Burst-style triage UI |

## COMMANDS
```bash
# Backend
uv run uvicorn app.main:app --reload

# Frontend
cd frontend && pnpm dev

# Tests
uv run pytest backend/tests -v
cd frontend && pnpm test

# Docker scrapers
docker compose --profile scrape run --rm scraper-practicas
docker compose --profile scrape run --rm scraper-computrabajo
```

## CONVENTIONS (Deviations Only)

| Rule | Standard | This Project |
|------|----------|--------------|
| Package manager (Python) | pip | **UV** — `uv sync`, `uv run`, `uv add` |
| Package manager (Node) | npm/yarn | **pnpm** |
| Markdown files | Create freely | **DON'T** — no .md unless user asks |
| TDD | Optional | **MANDATORY** — write tests first |
| Icons | Various | **Lucide only** |
| UI components | Various | **shadcn/ui only** — `pnpm dlx shadcn@latest add <component>` |

## ANTI-PATTERNS (THIS PROJECT)

1. **LaTeX sanitization** — `backend/app/main.py:387`
   ```
   # Do NOT sanitize_latex here: latex_content was produced by Jinja renderer
   # with sanitize_dict_for_latex; the only & are tabular column separators.
   # Escaping them breaks layout (role & dates in one cell).
   ```

2. **No CI pipeline** — No GitHub Actions, no Makefile. Tests run manually.

3. **Dual scraper scheduling** — APScheduler (24h in orchestrator) + Docker profiles (on-demand). Choose one.

4. **Telegram bot path hack** — `telegram-bot/bot.py` adds `backend/` to sys.path for imports. Tight coupling.

## NO AUTOMATED CI
- No `.github/workflows/`
- No `Makefile`
- Scraper execution via `docker compose --profile scrape` (designed for external scheduler like Dokploy)

## NOTES
- Job status enum: `NEW`, `SAVED`, `DISCARDED`, `GENERATED`, `APPLIED`, `EXPIRED`
- Root `main.py` is a stub — does nothing
- Scripts exist in both `backend/app/services/` and `scripts/` — potential drift
- Cursor rules in `.cursor/rules/*.mdc` are **ALWAYS APPLIED**
