"""
CronOpus FastAPI Application
Based on PRD V1.4 - Backend FastAPI
"""
from contextlib import asynccontextmanager
from datetime import date, datetime, time, timezone
from jinja2 import TemplateError
from typing import Optional
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlmodel import Session, select

from app.config import get_settings
from app.database import create_db_and_tables, get_session
from app.models.generated_cv import GeneratedCV
from app.models.job import Job, JobStatus, JobSource
from app.models.profile import Profile
from app.models.template import Template
from app.schemas.adapted_content import AdaptedContent
from app.schemas.profile_data import profile_to_profile_data, ProfileData
from app.services.jinja_renderer import render_jinja_template
from app.services.latex_compiler import compile_latex_to_pdf, CompilationError
from app.services.latex_sanitizer import sanitize_latex, repair_tabular_ampersands
from app.services.generate_cv_service import generate_cv_for_job, NotFoundError

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup."""
    create_db_and_tables()
    yield


app = FastAPI(
    title="CronOpus API",
    description="CV generation and job tracking API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware per PRD Section 4.C (Dashboard Web needs to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


class LoginBody(BaseModel):
    password: str


class CompileBody(BaseModel):
    content: str


class GenerateCvBody(BaseModel):
    job_id: UUID
    template_id: Optional[UUID] = None


class JobPatchBody(BaseModel):
    status: JobStatus


class PostJobBody(BaseModel):
    """Body for POST /api/jobs - create manual job. Task 4.8."""
    title: str
    company: str
    location: str
    description: str
    url: str
    salary: Optional[str] = None


class TemplatePutBody(BaseModel):
    content: str
    name: Optional[str] = None


class TemplatePostBody(BaseModel):
    content: str
    name: Optional[str] = None
    is_active: Optional[bool] = None


class CompileTemplateBody(BaseModel):
    content: Optional[str] = None


def get_current_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    """Validate Bearer token; raise 401 if missing or invalid."""
    if not credentials or credentials.credentials != settings.auth_token:
        raise HTTPException(status_code=401, detail="Token inválido o ausente")
    return credentials.credentials


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "app": "CronOpus API"}


@app.get("/health")
async def health():
    """Health check for Docker."""
    return {"status": "healthy"}


@app.post("/api/auth/login")
async def auth_login(body: LoginBody):
    """Validate master password and return token. Task 6.4."""
    effective = settings.effective_master_password()
    if not effective:
        raise HTTPException(status_code=503, detail="Auth no configurado (MASTER_PASSWORD)")
    if body.password != effective:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
    return {"token": settings.auth_token}


@app.get("/api/auth/verify")
async def auth_verify(_: str = Depends(get_current_token)):
    """Verify Bearer token. Task 6.4."""
    return {"valid": True}


@app.get("/api/profile")
async def get_profile(
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """Return the single profile (Profile.data). 503 if not seeded."""
    profile = session.exec(select(Profile)).first()
    if not profile:
        raise HTTPException(status_code=503, detail="Profile no configurado. Ejecuta seed_profile.")
    return profile.data


@app.patch("/api/profile")
async def patch_profile(
    body: dict,
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """Update the single profile. Validates body with ProfileData. 503 if no profile, 422 if invalid."""
    profile = session.exec(select(Profile)).first()
    if not profile:
        raise HTTPException(status_code=503, detail="Profile no configurado. Ejecuta seed_profile.")
    try:
        validated = ProfileData.model_validate(body)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    new_data = validated.model_dump(by_alias=True)
    if "id" in profile.data:
        new_data["id"] = profile.data["id"]
    profile.data = new_data
    profile.updated_at = datetime.now(timezone.utc)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile.data


@app.post("/api/jobs", status_code=201)
async def post_job(
    body: PostJobBody,
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """Create a manual job. Task 4.8."""
    job = Job(
        external_id=f"manual-{uuid4()}",
        source=JobSource.MANUAL,
        status=JobStatus.SAVED,
        title=body.title,
        company=body.company,
        location=body.location,
        description=body.description,
        url=body.url,
        salary=body.salary,
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


@app.get("/api/jobs")
async def list_jobs(
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
    status: Optional[JobStatus] = None,
    source: Optional[JobSource] = None,
):
    """List jobs with optional filters. Task 6.1."""
    statement = select(Job)
    if status is not None:
        statement = statement.where(Job.status == status)
    if source is not None:
        statement = statement.where(Job.source == source)
    statement = statement.order_by(Job.created_at.desc())
    jobs = session.exec(statement).all()
    return list(jobs)


@app.get("/api/jobs/{job_id}")
async def get_job(
    job_id: UUID,
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """Get a job by id. Task 6.1."""
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return job


@app.patch("/api/jobs/{job_id}")
async def patch_job(
    job_id: UUID,
    body: JobPatchBody,
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """Update job status. Sets applied_at when status is APPLIED. Task 6.1."""
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    job.status = body.status
    if body.status == JobStatus.APPLIED and job.applied_at is None:
        job.applied_at = datetime.now(timezone.utc)
    job.updated_at = datetime.now(timezone.utc)
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


@app.delete("/api/jobs/{job_id}")
async def delete_job(
    job_id: UUID,
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """Delete a job. Task 6.1."""
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    session.delete(job)
    session.commit()
    return Response(status_code=204)


@app.get("/api/templates")
async def list_templates(
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """List all templates. Task 6.2."""
    statement = select(Template).order_by(Template.created_at.desc())
    templates = session.exec(statement).all()
    return list(templates)


@app.get("/api/templates/active")
async def get_active_template(
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """Get the active template. 404 if none. Task 6.2."""
    statement = select(Template).where(Template.is_active == True)
    template = session.exec(statement).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template activa no encontrada")
    return template


@app.put("/api/templates/{template_id}")
async def put_template(
    template_id: UUID,
    body: TemplatePutBody,
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """Update template content and optionally name. Task 6.2."""
    template = session.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template no encontrada")
    template.content = body.content
    if body.name is not None:
        template.name = body.name
    template.updated_at = datetime.now(timezone.utc)
    session.add(template)
    session.commit()
    session.refresh(template)
    return template


@app.post("/api/templates", status_code=201)
async def post_template(
    body: TemplatePostBody,
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """Create a new template version. Task 6.2."""
    existing = session.exec(select(Template)).all()
    new_version = (max(t.version for t in existing) + 1) if existing else 1
    is_active = body.is_active is True
    if is_active:
        for t in existing:
            t.is_active = False
            session.add(t)
    name = body.name or f"Template v{new_version}"
    template = Template(
        name=name,
        version=new_version,
        content=body.content,
        is_active=is_active,
    )
    session.add(template)
    session.commit()
    session.refresh(template)
    return template


def _cv_list_item(cv: GeneratedCV, job: Job) -> dict:
    """Build list item for GET /api/cvs (id, job_id, job_title, company, source, created_at)."""
    return {
        "id": cv.id,
        "job_id": cv.job_id,
        "job_title": job.title,
        "company": job.company,
        "source": job.source,
        "created_at": cv.created_at,
    }


@app.get("/api/cvs")
async def list_cvs(
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
    company: Optional[str] = None,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
):
    """List generated CVs with optional filters. Task 6.3."""
    statement = select(GeneratedCV, Job).where(GeneratedCV.job_id == Job.id)
    if company and company.strip():
        statement = statement.where(Job.company.ilike(f"%{company.strip()}%"))
    if from_date is not None:
        from_dt = datetime.combine(from_date, time.min).replace(tzinfo=timezone.utc)
        statement = statement.where(GeneratedCV.created_at >= from_dt)
    if to_date is not None:
        to_dt = datetime.combine(to_date, time.max).replace(tzinfo=timezone.utc)
        statement = statement.where(GeneratedCV.created_at <= to_dt)
    statement = statement.order_by(GeneratedCV.created_at.desc())
    results = session.exec(statement).all()
    return [_cv_list_item(cv, job) for cv, job in results]


@app.post("/api/cvs/{cv_id}/recompile")
async def recompile_cv(
    cv_id: UUID,
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """Regenerate PDF from stored LaTeX. Task 6.3."""
    cv = session.get(GeneratedCV, cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV no encontrado")
    # Do NOT sanitize_latex here: latex_content was produced by our Jinja renderer
    # with sanitize_dict_for_latex on data; the only & in it are tabular column
    # separators. Escaping them would break the layout (role & dates in one cell).
    # However, repair old CVs that were saved with sanitize_latex applied incorrectly.
    latex_to_compile = repair_tabular_ampersands(cv.latex_content)
    try:
        pdf_bytes = compile_latex_to_pdf(latex_to_compile)
        return Response(content=pdf_bytes, media_type="application/pdf")
    except CompilationError as e:
        raise HTTPException(status_code=422, detail=e.log)


@app.get("/api/cvs/{cv_id}")
async def get_cv(
    cv_id: UUID,
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """Get CV detail with job_title and company. Task 6.3."""
    cv = session.get(GeneratedCV, cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV no encontrado")
    job = session.get(Job, cv.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    out = {
        "id": cv.id,
        "job_id": cv.job_id,
        "template_id": cv.template_id,
        "latex_content": cv.latex_content,
        "notes": cv.notes,
        "created_at": cv.created_at,
        "updated_at": cv.updated_at,
        "job_title": job.title,
        "company": job.company,
    }
    return out


@app.delete("/api/cvs/{cv_id}")
async def delete_cv(
    cv_id: UUID,
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """Delete a generated CV. Task 6.3."""
    cv = session.get(GeneratedCV, cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV no encontrado")
    session.delete(cv)
    session.commit()
    return Response(status_code=204)


@app.post("/api/compile-template")
async def compile_template(
    body: CompileTemplateBody,
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """Compile LaTeX+Jinja template with profile and adapted context. Task 6.5.3."""
    content = body.content
    if not content:
        statement = select(Template).where(Template.is_active == True)
        template = session.exec(statement).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template activa no encontrada")
        content = template.content

    profile = session.exec(select(Profile)).first()
    if not profile:
        raise HTTPException(status_code=503, detail="Profile no configurado. Ejecuta seed_profile.")

    profile_data = profile_to_profile_data(profile)
    adapted = AdaptedContent()

    try:
        latex = render_jinja_template(content, profile_data, adapted)
    except TemplateError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        pdf_bytes = compile_latex_to_pdf(latex)
        return Response(content=pdf_bytes, media_type="application/pdf")
    except CompilationError as e:
        raise HTTPException(status_code=422, detail=e.log)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/compile")
async def compile_latex(body: CompileBody):
    """Compile LaTeX to PDF. Task 5.3. Sanitize raw LaTeX -> Tectonic -> PDF or error log."""
    try:
        pdf_bytes = compile_latex_to_pdf(sanitize_latex(body.content))
        return Response(content=pdf_bytes, media_type="application/pdf")
    except CompilationError as e:
        raise HTTPException(status_code=422, detail=e.log)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-cv")
async def generate_cv(body: GenerateCvBody, session: Session = Depends(get_session)):
    """Generate CV for job: Job -> Template -> Gemini -> Sanitize -> Compile -> save GeneratedCV. Task 5.4."""
    try:
        pdf_bytes, generated_cv, job = generate_cv_for_job(
            session,
            body.job_id,
            body.template_id,
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "X-Generated-Cv-Id": str(generated_cv.id),
                "X-Job-Title": job.title,
                "X-Company": job.company,
            },
        )
    except NotFoundError as e:
        if e.resource == "profile":
            raise HTTPException(status_code=503, detail="Profile no configurado. Ejecuta seed_profile.")
        raise HTTPException(status_code=404, detail=f"{e.resource} no encontrado")
    except CompilationError as e:
        raise HTTPException(status_code=422, detail=e.log)
    except ValueError as e:
        if "GEMINI" in str(e) or "api_key" in str(e).lower():
            raise HTTPException(status_code=503, detail=str(e))
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
