#!/usr/bin/env python3
"""
Profile seed script (Task 6.5.1).
Loads docs/profile.json and creates/updates the single Profile record in DB.
Run from project root: uv run python scripts/seed_profile.py
"""
import sys
from pathlib import Path

# Add backend/ to path so we can import app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.services.seed_profile import run_seed


def main() -> None:
    run_seed()
    print("Profile seeded successfully.")


if __name__ == "__main__":
    main()
