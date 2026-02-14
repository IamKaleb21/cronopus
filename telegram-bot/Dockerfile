# ===========================================
# CronOpus Telegram Bot - Dockerfile
# Based on PRD V1.4 - Deployment Strategy
# ===========================================

# Use Python 3.12 slim image
FROM python:3.12-slim-bookworm

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100

# Install system dependencies (if any needed for psycopg2 or others)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv for dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Set working directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-install-project --no-dev

# Copy application code (backend, scrapers, telegram-bot)
COPY backend/ backend/
COPY scrapers/ scrapers/
COPY telegram-bot/ telegram-bot/

# Add project root to PYTHONPATH so imports work
ENV PYTHONPATH=/app

# Run the bot
CMD ["uv", "run", "telegram-bot/run.py"]
