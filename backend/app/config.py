"""
CronOpus Backend Configuration
Based on PRD V1.4 - Stack Tecnológico
"""
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings
from functools import lru_cache

# Project root (parent of backend/)
_PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database - defaults to SQLite for development/testing
    database_url: str = "sqlite:///./cronopus_dev.db"
    
    # Gemini AI
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    
    # Telegram Bot
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    
    # Auth (single-user, master password + token)
    master_password: str = ""
    auth_token: str = "cronopus-secret-token"
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    model_config = {
        # Allow running from repo root (./.env) or from ./backend (../.env)
        "env_file": [".env", "../.env"],
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @model_validator(mode="after")
    def resolve_sqlite_path(self) -> "Settings":
        """Resolve SQLite DB path relative to project root so seed and uvicorn use same file."""
        url = self.database_url
        if url.startswith("sqlite:///") and not url.startswith("sqlite:////"):
            # Relative path: sqlite:///./foo.db or sqlite:///foo.db
            path_part = url.replace("sqlite:///", "").lstrip("./")
            abs_path = (_PROJECT_ROOT / path_part).resolve()
            self.database_url = f"sqlite:///{abs_path}"
        return self

    def effective_master_password(self) -> str:
        """Password to validate against. In dev (SQLite) with empty master_password, allow 'dev'."""
        if self.master_password:
            return self.master_password
        if "sqlite" in self.database_url.lower():
            return "dev"
        return ""


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
