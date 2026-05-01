# BACKEND KNOWLEDGE BASE

**Generated:** 2026-04-27
**Commit:** ae5419e
**Branch:** main

## OVERVIEW
FastAPI backend with SQLModel ORM, Gemini AI CV generation, LaTeX rendering, and Telegram bot integration.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| FastAPI entry | `backend/app/main.py` | App init, CORS, routes import |
| Config | `backend/app/config.py` | Settings from env, SQLite path resolution |
| DB session | `backend/app/database.py` | SQLModel engine, session dependency |
| Models | `backend/app/models/` | Job, Template, GeneratedCV, Profile |
| Schemas | `backend/app/schemas/` | Pydantic DTOs (adapted_content, profile_data) |
| CV pipeline | `backend/app/services/` | Gemini call, Jinja render, Tectonic compile |
| Seed scripts | `backend/app/services/seed_profile.py`, `seed_template.py` | Init profile + template |

## CONVENTIONS (Backend-specific)
- **ORM:** SQLModel — import from `app.models`, session from `app.database`
- **Job status:** `NEW`, `SAVED`, `DISCARDED`, `GENERATED`, `APPLIED`, `EXPIRED` — use enum consistently
- **CORS:** Add origins via `config.py` settings, not hardcoded
- **SQLite dev:** Path resolved relative to project root via `config.py:resolve_sqlite_path()`
- **Async:** Prefer `async def` for route handlers

## ANTI-PATTERNS
1. **Do NOT call `sanitize_latex` on Jinja-rendered output** — `latex_content` already processed by `sanitize_dict_for_latex`; escaping `&` breaks table layout (`backend/app/main.py:387`)
2. **No API routes yet in `api/`** — currently empty; add routes here but do not duplicate in `main.py`
