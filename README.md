# CronOpus

Centro de comando personal para la búsqueda de empleo. Automatiza la detección de ofertas (scrapers) y la personalización de CVs en LaTeX con IA (Gemini).

## Características

- **Scrapers desacoplados**: Practicas.pe (BeautifulSoup) y CompuTrabajo (Playwright)
- **Bot de Telegram**: Notificaciones tipo "ráfaga silenciosa" con botones [💎 Guardar] [❌ Descartar]
- **Dashboard web**: React + Vite, gestión de ofertas, generación de CV con IA
- **Generación de CV**: Job → Gemini (adaptación JSON) → plantilla Jinja LaTeX → Tectonic → PDF
- **Trabajos manuales**: Crear ofertas a mano desde el dashboard (fuente MANUAL)

## Stack técnico

| Componente | Tecnología |
|------------|------------|
| Backend | FastAPI, SQLModel, Pydantic |
| Frontend | React 19, Vite, TanStack Query, Tailwind, shadcn/ui |
| DB | SQLite (dev) / PostgreSQL (Docker) |
| IA | Google Gemini |
| LaTeX | Tectonic |
| Scrapers | BeautifulSoup, Playwright |

## Requisitos

- **Python 3.12+** (UV como gestor)
- **Node 24+** (pnpm)
- **mise** (opcional, para versiones): `mise install`

## Desarrollo local

### 1. Backend

```bash
# Instalar dependencias (UV)
uv sync

# Base de datos SQLite por defecto (dev)
# Crear .env con DATABASE_URL=sqlite:///./cronopus_dev.db

# Seed inicial (profile + template)
uv run python -m app.services.seed_profile
uv run python -m app.services.seed_template

# Levantar servidor
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
pnpm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000
pnpm dev
```

### 3. Variables de entorno

Crea `.env` en la raíz:

```env
# Base de datos
DATABASE_URL=sqlite:///./cronopus_dev.db

# Auth
MASTER_PASSWORD=dev
AUTH_TOKEN=cronopus-secret-token

# Gemini (obligatorio para generar CVs)
GEMINI_API_KEY=tu-api-key
GEMINI_MODEL=gemini-2.5-flash

# Telegram (opcional, para bot)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Frontend (en frontend/.env)
VITE_API_URL=http://localhost:8000
```

## Docker

```bash
# Servicios principales (backend, frontend, db, telegram-bot)
docker compose up -d

# Scrapers (correr bajo demanda con profile)
docker compose --profile scrape run --rm scraper-practicas
docker compose --profile scrape run --rm scraper-computrabajo
```

Para Docker usa PostgreSQL. Define `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` en `.env`.

## Estructura del proyecto

```
cronopus/
├── backend/           # FastAPI, modelos, servicios
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   └── tests/
├── frontend/          # React + Vite
│   └── src/
├── scrapers/          # Módulos independientes (practicas_pe, computrabajo)
├── telegram-bot/      # Bot de triaje
├── scripts/           # run_practicas, run_computrabajo, etc.
├── docs/              # PRD, design_system, plantilla LaTeX
└── docker-compose.yml
```

## Tests

```bash
# Backend (pytest)
uv run pytest backend/tests -v

# Frontend (vitest)
cd frontend && pnpm test
```