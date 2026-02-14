"""
Task 7.2: Environment configuration (.env)

We don't validate secret values; we only assert required keys exist in a local env file.
"""

from pathlib import Path


PROJECT_ROOT = Path(__file__).parent.parent


REQUIRED_KEYS = [
    "DATABASE_URL",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "GEMINI_API_KEY",
    "AUTH_TOKEN",
]


def parse_env_keys(text: str) -> set[str]:
    keys: set[str] = set()
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key = line.split("=", 1)[0].strip()
        if key:
            keys.add(key)
    return keys


class TestEnvFile:
    def test_env_file_exists(self):
        env_file = PROJECT_ROOT / ".env"
        assert env_file.is_file(), ".env must exist for local docker-compose development"

    def test_env_file_has_required_keys(self):
        env_file = PROJECT_ROOT / ".env"
        keys = parse_env_keys(env_file.read_text(encoding="utf-8"))
        missing = [k for k in REQUIRED_KEYS if k not in keys]
        assert not missing, f".env is missing required keys: {missing}"

