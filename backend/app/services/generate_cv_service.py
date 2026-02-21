"""
Orchestrates full CV generation: Job + Profile + Template -> Gemini JSON -> Render Jinja -> Compile -> GeneratedCV.
Task 6.5.5.
"""
from uuid import UUID
from typing import Optional

from sqlmodel import Session, select

from app.models.job import Job, JobStatus
from app.models.template import Template
from app.models.profile import Profile
from app.models.generated_cv import GeneratedCV
from app.schemas.profile_data import profile_to_profile_data
from app.services.gemini_service import GeminiService
from app.services.latex_compiler import compile_latex_to_pdf, CompilationError
from app.services.jinja_renderer import render_jinja_template


class NotFoundError(Exception):
    """Raised when job, template or profile is not found. .args[0] is 'job', 'template' or 'profile'."""

    def __init__(self, resource: str):
        self.resource = resource
        super().__init__(resource)


def generate_cv_for_job(
    session: Session,
    job_id: UUID,
    template_id: Optional[UUID],
    *,
    api_key: str,
    model: str = "gemini-2.5-flash",
) -> tuple[bytes, GeneratedCV, Job]:
    """
    Get job, template and profile, call Gemini (JSON), render Jinja, compile, save GeneratedCV.
    Returns (pdf_bytes, generated_cv, job).
    Raises NotFoundError('job'|'template'|'profile'), CompilationError, or ValueError if api_key empty or Gemini JSON invalid.
    """
    job = session.get(Job, job_id)
    if not job:
        raise NotFoundError("job")

    if template_id is not None:
        template = session.get(Template, template_id)
        if not template:
            raise NotFoundError("template")
    else:
        statement = select(Template).where(Template.is_active == True)
        template = session.exec(statement).first()
        if not template:
            raise NotFoundError("template")

    profile = session.exec(select(Profile)).first()
    if not profile:
        raise NotFoundError("profile")

    if not (api_key or "").strip():
        raise ValueError("GEMINI_API_KEY no configurado")

    profile_data = profile_to_profile_data(profile)
    gemini = GeminiService(api_key=api_key.strip(), model=model)
    adapted = gemini.generate_adapted_content_json(job.description, profile_data)
    latex = render_jinja_template(template.content, profile_data, adapted)
    pdf_bytes = compile_latex_to_pdf(latex)

    generated_cv = GeneratedCV(
        job_id=job.id,
        latex_content=latex,
        template_id=template.id,
    )
    session.add(generated_cv)
    job.status = JobStatus.GENERATED
    session.add(job)
    session.commit()
    session.refresh(generated_cv)
    session.refresh(job)

    return (pdf_bytes, generated_cv, job)
