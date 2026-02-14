#!/usr/bin/env python3
"""
Template seed script (Task 6.5.3).
Loads docs/cv_master_jinja.tex and creates/updates the active template in DB.
Run from project root: uv run python scripts/seed_template.py
"""
import sys
from pathlib import Path

# Add backend/ to path so we can import app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.services.seed_template import run_seed


def main() -> None:
    run_seed()
    print("Template seeded successfully.")


if __name__ == "__main__":
    main()
