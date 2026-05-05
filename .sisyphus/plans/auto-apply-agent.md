# Auto-Apply AI Agent - Design

**Date:** 2026-05-05
**Status:** Draft
**Branch:** `feat/scraper-filters-update` (PR #2)

---

## 1. Concept & Vision

Agente de IA que postula automáticamente a jobs en **Computrabajo** y **Bumeran**. El usuario marca jobs como "interested" (status `SAVED`) y el agente genera cover letter con MiniMax, autocompleta el formulario, sube el CV PDF y hace submit sin revisión.

**Core principle:** Fully autonomous, zero friction. El usuario solo marca qué jobs le interesan.

---

## 2. Architecture

### Directory Structure

```
backend/app/
├── auto_apply/
│   ├── __init__.py
│   ├── agent.py              # Orchestrator principal
│   ├── config.py             # Configuración de .env
│   ├── text_generator.py     # Wrapper MiniMax API
│   ├── form_filler.py        # Playwright wrapper
│   └── portals/
│       ├── __init__.py
│       ├── base.py           # AbstractPortalAdapter
│       ├── computrabajo.py    # PortalAdapter para Computrabajo
│       └── bumeran.py        # PortalAdapter para Bumeran
```

### Components

| Component | Responsibility |
|-----------|----------------|
| `agent.py` | Orchestrator - detecta jobs SAVED, coordina flujo, maneja errores, marca APPLIED |
| `text_generator.py` | Genera cover letter y respuestas usando MiniMax API |
| `form_filler.py` | Playwright wrapper - login, navegación, fill, upload, click, submit, screenshot |
| `portals/base.py` | Interfaz abstracta para portal adapters |
| `portals/computrabajo.py` | Implementación específica: selectors, flujo login, estructura form |
| `portals/bumeran.py` | Implementación específica para Bumeran |

### Data Flow

```
User marca job como SAVED
         │
         ▼
  AutoApplyAgent.run()
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Computrabajo  Bumeran
 Adapter     Adapter
    │         │
    └────┬────┘
         │
         ▼
   TextGenerator.generate_cover_letter(job, profile)
         │
         ▼
   FormFiller.login(credentials)
         │
         ▼
   FormFiller.fill_and_submit(job, cover_letter, cv_pdf_path)
         │
         ▼
   Verify success via screenshot
         │
         ▼
   Job.applied_at = now()
   Job.status = APPLIED
   ApplicationLog entry created
```

---

## 3. Portal Adapters

### Abstract Interface (base.py)

```python
class AbstractPortalAdapter(ABC):
    @abstractmethod
    async def login(self, page: Page, email: str, password: str) -> bool:
        """Login al portal. Retorna True si exitoso."""

    @abstractmethod
    async def get_form_fields(self, page: Page, job_url: str) -> list[FormField]:
        """Extrae la estructura del formulario (tipo de campo, label, required)."""

    @abstractmethod
    async def fill_form(self, page: Page, fields: dict[str, str]) -> None:
        """Autocompleta los campos del formulario."""

    @abstractmethod
    async def upload_cv(self, page: Page, cv_path: Path) -> bool:
        """Sube el CV en PDF. Retorna True si exitoso."""

    @abstractmethod
    async def submit(self, page: Page) -> bool:
        """Hace submit. Retorna True si la aplicación fue exitosa."""

    @abstractmethod
    async def verify_success(self, page: Page) -> bool:
        """Verifica que la postulación fue exitosa (screenshot como evidencia)."""

    @property
    @abstractmethod
    def portal_name(self) -> str:
        """Nombre del portal: 'computrabajo' | 'bumeran'"""
```

### FormField Schema

```python
class FormField(BaseModel):
    type: Literal["text", "textarea", "file", "select", "checkbox", "button"]
    name: str                      # HTML name attribute
    label: str                     # Human-readable label
    required: bool
    options: Optional[list[str]] = None  # For select fields
    max_length: Optional[int] = None      # For text/textarea
```

---

## 4. Text Generation (MiniMax)

### Prompt Template

```
Eres un asistente de postulación laboral. Genera una carta de presentación
concisa y profesional basada en:

Job Title: {job.title}
Company: {job.company}
Description: {job.description[:2000]}

Candidate Profile:
{profile_text}

Requisitos:
- Máximo 300 palabras
- Tono profesional pero cercano
- Destacar experiencia relevante
- No repetir el CV, complementarlo
- No usar frases genéricas

Respuesta: Solo el texto de la carta, sin encabezados ni despedida.
```

### Fallback

Si MiniMax falla, usar texto genérico predefinido del profile.

---

## 5. Form Filling (Playwright)

### Rate Limiting

- `AUTO_APPLY_DELAY_SECONDS=30` entre aplicaciones
- `AUTO_APPLY_MAX_PER_DAY=20` máximo por día
- Backoff exponencial si se detecta rate limit

### Error Handling

| Error | Action |
|-------|--------|
| Login failed | Retry 2x, luego notificar (Telegram) |
| Form not found | Skip job, log error, marcar con `apply_attempts` |
| Captcha detected | Pausar agente, notificar usuario |
| Upload failed | Retry con CV alternativo (backup) |
| Submit timeout | Verificar estado, retry si necesario |
| Rate limited | Backoff 5min, continuar |

### Screenshot Evidence

Después de cada postulación exitosa:
- Guardar screenshot en `auto_apply/evidence/{job_id}_{portal}_{timestamp}.png`
- Guardar path en `ApplicationLog.screenshot_path`

---

## 6. Database Extensions

### Job Model Extension

```python
# En backend/app/models/job.py - agregar campos:

applied_at: Optional[datetime] = None
apply_attempts: int = 0
last_apply_error: Optional[str] = None
```

### ApplicationLog Model (nuevo)

```python
# backend/app/models/application_log.py

class ApplicationLog(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4)
    job_id: UUID = Field(foreign_key="job.id")
    portal: str  # "computrabajo" | "bumeran"
    applied_at: datetime
    success: bool
    screenshot_path: Optional[str] = None
    error_message: Optional[str] = None

    job: Job = Relationship()
```

---

## 7. Configuration (.env)

```env
# Auto-Apply Agent
MINIMAX_API_KEY=tu-api-key
MINIMAX_MODEL=minimax-01
AUTO_APPLY_ENABLED=true
AUTO_APPLY_DELAY_SECONDS=30
AUTO_APPLY_MAX_PER_DAY=20

# Portal Credentials
COMPUTRABAJO_EMAIL=usuario@mail.com
COMPUTRABAJO_PASSWORD=contraseña
BUMERAN_EMAIL=usuario@mail.com
BUMERAN_PASSWORD=contraseña
```

### Config Class

```python
# backend/app/auto_apply/config.py

from pydantic_settings import BaseSettings

class AutoApplySettings(BaseSettings):
    minimax_api_key: str
    minimax_model: str = "minimax-01"
    enabled: bool = False
    delay_seconds: int = 30
    max_per_day: int = 20
    computrabajo_email: str
    computrabajo_password: str
    bumeran_email: str
    bumeran_password: str

    class Config:
        env_prefix = "AUTO_APPLY_"
        alias_prefix = ""
```

---

## 8. API Endpoints

### POST /api/auto-apply/run

Ejecuta el agente para jobs pendientes.

```python
@app.post("/api/auto-apply/run")
async def run_auto_apply(
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
):
    """
    Ejecuta auto-apply para todos los jobs en status SAVED.
    Retorna lista de resultados.
    """
    if not settings.auto_apply_enabled:
        raise HTTPException(503, detail="Auto-apply deshabilitado")

    agent = AutoApplyAgent()
    results = await agent.run(session)
    return {"applied": len([r for r in results if r.success]), "failed": len([r for r in results if not r.success]), "results": results}
```

### GET /api/auto-apply/logs

Historial de aplicaciones.

```python
@app.get("/api/auto-apply/logs")
async def get_apply_logs(
    session: Session = Depends(get_session),
    _: str = Depends(get_current_token),
    limit: int = 50,
):
    """Retorna historial de aplicaciones."""
    logs = session.exec(
        select(ApplicationLog).order_by(ApplicationLog.applied_at.desc()).limit(limit)
    ).all()
    return list(logs)
```

### POST /api/auto-apply/stop

Detiene el agente en ejecución.

---

## 9. CLI Command

```bash
# Ejecutar auto-apply manualmente
uv run python -m app.auto_apply.run

# Ver status
uv run python -m app.auto_apply.status
```

---

## 10. Anti-Patterns

1. **No hardcodear selectors** — Usar CSS selectors del portal específicos, no genéricos
2. **No guardar credenciales en código** — Solo en .env
3. **No hacer submit sin verificar** — Siempre tomar screenshot como evidencia
4. **No ignorar rate limits** — Respetar delays configurados
5. **No bloquear el API** — Auto-apply corre en background, no en request HTTP

---

## 11. Testing Strategy

- **Unit tests:** text_generator con mock de MiniMax API
- **Integration tests:** Portal adapters con Playwright en modo headed (visible)
- **E2E tests:** Flujo completo con cuenta de test

---

## 12. Implementation Order

1. Models (Job extension + ApplicationLog)
2. Config loader
3. FormFiller base (Playwright wrapper)
4. Portal adapters (Computrabajo primero, luego Bumeran)
5. TextGenerator
6. Agent orchestrator
7. API endpoints
8. CLI command
9. Integration tests