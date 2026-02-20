#!/usr/bin/env python3
"""
One-off seed script to add many jobs for testing pagination.
Uses the same DB as the app (e.g. cronopus_dev.db).
Run from project root: uv run python scripts/seed_jobs.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from uuid import uuid4
from sqlmodel import Session
from app.database import engine, create_db_and_tables
from app.models.job import Job, JobSource, JobStatus

TITLES = [
    "Desarrollador Backend Python",
    "Analista de Datos",
    "Practicante de Marketing",
    "Ingeniero de Software Full Stack",
    "Asistente Administrativo",
    "Diseñador UX/UI",
    "Contador Junior",
    "Ejecutivo Comercial",
    "Practicante de Recursos Humanos",
    "Desarrollador Frontend React",
    "Analista Financiero",
    "Asistente de Logística",
    "Community Manager",
    "Practicante de Ingeniería",
    "Técnico de Soporte IT",
]

COMPANIES = [
    "Tech Solutions Perú",
    "Banco Continental",
    "Clínica San Felipe",
    "Ripley Perú",
    "Falabella",
    "BBVA",
    "Interbank",
    "Aje Group",
    "Gloria",
    "Alicorp",
    "Southern Copper",
    "Credicorp",
    "Ferreycorp",
    "Real Plaza",
    "Plaza Vea",
    "Saga Falabella",
    "Cineplanet",
    "Latam Airlines",
    "Movistar",
    "Entel",
]

LOCATIONS = ["Lima", "Arequipa", "Trujillo", "Remoto", "Lima - San Isidro", "Lima - Miraflores", "Híbrido"]


def main(count: int = 300) -> None:
    create_db_and_tables()
    sources = [JobSource.COMPUTRABAJO, JobSource.PRACTICAS_PE, JobSource.MANUAL]
    statuses = [JobStatus.NEW, JobStatus.NEW, JobStatus.NEW, JobStatus.SAVED, JobStatus.DISCARDED]  # mostly NEW

    with Session(engine) as session:
        for i in range(count):
            job = Job(
                external_id=f"seed-{i}-{uuid4().hex[:8]}",
                source=sources[i % len(sources)],
                status=statuses[i % len(statuses)],
                title=f"{TITLES[i % len(TITLES)]} #{i + 1}",
                company=COMPANIES[i % len(COMPANIES)],
                location=LOCATIONS[i % len(LOCATIONS)],
                description="Descripción de prueba para visualizar la paginación en el dashboard.",
                url=f"https://example.com/job/{i}",
                salary="A convenir" if i % 3 else None,
            )
            session.add(job)
        session.commit()
    print(f"Se crearon {count} jobs. Recarga el Dashboard para ver la paginación.")


if __name__ == "__main__":
    main(300)
