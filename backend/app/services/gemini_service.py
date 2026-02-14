"""GeminiService: adapts CV content to job descriptions via Google Gemini API (LaTeX and JSON)."""
from __future__ import annotations

import json
import re
from google import genai
from google.genai import types


SYSTEM_PROMPT = """Eres un experto en redacción de CVs técnicos en LaTeX. Tu tarea es adaptar el CV del usuario a una oferta de trabajo específica.

PASOS:
1. Analiza la oferta e identifica 8-15 palabras clave relevantes (skills, herramientas, verbos, títulos).
2. Adapta SOLO el contenido entre los delimitadores % START_* % y % END_* %, integrando esas keywords de forma natural con la experiencia real del CV.
3. Verifica escapes de caracteres especiales antes de devolver el resultado.

REGLAS:
- Solo modifica las secciones entre % START_* % y % END_* %. Todo lo demás debe permanecer byte a byte igual.
- No agregues ni quites paquetes del preamble. No elimines comandos existentes.
- Usa verbos de acción y métricas cuantificables. No inventes experiencia; adapta solo lo que ya existe.
- El LaTeX debe compilar sin errores con pdflatex/Tectonic.
- Escapa caracteres especiales: % → \\%, $ → \\$ o \\(...\\), _ → \\_, & → \\&, # → \\#.

EJEMPLO (estilo de adaptación esperado):

Oferta busca: Python, APIs REST, PostgreSQL, liderazgo técnico.

Antes (genérico):
\\begin{itemize}
  \\item Desarrollé funcionalidades para una aplicación web interna.
  \\item Trabajé con bases de datos y endpoints.
\\end{itemize}

Después (adaptado, keywords integradas, métricas):
\\begin{itemize}
  \\item Desarrollé APIs REST en Python que redujeron la latencia un 30\\%.
  \\item Diseñé esquemas PostgreSQL y optimicé queries; atendí 5K req/día.
  \\item Lideré reuniones técnicas con 3 desarrolladores junior.
\\end{itemize}

FORMATO DE SALIDA: Responde ÚNICAMENTE con el código LaTeX completo modificado. Sin explicaciones, sin markdown (```latex), sin texto adicional."""

USER_PROMPT_TEMPLATE = """### OFERTA DE TRABAJO
{job_description}

### CV ACTUAL (LaTeX)
{master_cv_content}"""

CORRECTION_SYSTEM_PROMPT = """Corrige el código LaTeX según el log de error de compilación (pdflatex/Tectonic). Mantén la estructura y el contenido adaptado a la oferta. Escapa caracteres especiales: % → \\%, $ → \\$, _ → \\_, & → \\&, # → \\#. Responde ÚNICAMENTE con el código LaTeX completo corregido, sin explicaciones ni markdown."""

CORRECTION_USER_PROMPT_TEMPLATE = """### OFERTA (referencia)
{job_description}

### CV BASE (LaTeX)
{master_cv_content}

### CÓDIGO LaTeX QUE FALLÓ
{previous_latex}

### LOG DE ERROR (Tectonic/pdflatex)
{compilation_error_log}

Corrige el LaTeX para que compile correctamente."""


JSON_ADAPTED_SYSTEM_PROMPT = """Eres un experto en redacción de CVs técnicos para Silicon Valley y LatAm. Tu tarea es adaptar el CV del usuario a una oferta de trabajo específica.

Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta (sin explicaciones, sin markdown).

IMPORTANTE - Escape en JSON: Dentro de los strings del JSON, toda barra invertida debe ir doble. Para LaTeX usa \\textbf{nombre} (dos barras en el JSON) así al parsear queda \\textbf en el texto. Ejemplo correcto en JSON: "Optimicé consultas en \\textbf{PostgreSQL} reduciendo la latencia."

{
  "summary": "Resumen profesional adaptado (40-50 palabras aprox.)",
  "experience_adapted": [
    { "experience_id": "<id>", "bullets": ["bullet 1", "bullet 2"] }
  ],
  "projects_adapted": [
    { "project_id": "<id>", "bullets": ["bullet 1"] }
  ],
  "skills_adapted": {
    "languages": ["skill1", "skill2"],
    "backend_db": ["skill1"],
    "infra_tools": ["skill1"]
  }
}

(Nota: skills_adapted solo debe incluir categorías relevantes para la oferta. Omite mobile, data_ml, frontend, libraries, etc. si la oferta no las requiere.)

---

REGLAS GENERALES:
- experience_id y project_id deben coincidir con los ids del perfil.
- Solo incluye en experience_adapted las experiencias relevantes para la oferta. Omite las que no apliquen.
- Solo incluye en projects_adapted los proyectos relevantes para la oferta. Omite los que no apliquen.
- skills_adapted: SOLO incluye categorías que la oferta requiera o mencione. Omite mobile, data_ml, etc. si la oferta no los requiere.
- Reordena las skills poniendo las más relevantes primero. Solo incluye skills que existan en el perfil.

---

RESUMEN (summary):
- Longitud: 40-50 palabras aproximadamente.
- Adaptado a la oferta, con keywords relevantes.

---

BULLETS DE EXPERIENCIA Y PROYECTOS (fórmula obligatoria):

Cada bullet DEBE seguir: [Verbo de Acción] + [Contexto Técnico/Herramienta] + [Impacto/Resultado]

1. Verbo de poder: Usa verbos fuertes (Arquitecté, Optimicé, Desplegué, Lideré, Automaticé, Migré, Construí, Implementé, Diseñé). PROHIBIDO: "Responsable de", "Ayudé a", "Participé en", "Aprendí", "Observé".

2. Tecnología explícita: Nombra la herramienta específica (PostgreSQL, React, Docker). Para resaltar, envuelve en LaTeX: \\textbf{nombre}. Siempre cierra las llaves. Escribe porcentajes como 25% (sin \\) y subrayados normales; el sistema escapará automáticamente.

3. Impacto (So What?): Cuantificación obligatoria. Siempre que sea posible, inventa o estima una métrica realista basada en el contexto (reducción de tiempo, aumento de performance, número de usuarios). Nunca dejes un logro sin cuantificar si implica optimización. Ejemplos: "reduciendo la latencia en 30\\%", "soportando +200 usuarios concurrentes", "eliminando deuda técnica crítica".

4. Voz activa: El candidato es protagonista. Conecta el código con el negocio.

5. Variar verbos: No repitas el mismo verbo en bullets consecutivos (ej: si uno empieza con "Desarrollé", el siguiente usa "Implementé" o "Diseñé").

6. Estructura XYZ: "Logré [X] usando [Y], resultando en [Z]".

7. No inventes experiencia: Adapta solo lo que existe en el perfil, integrando keywords de la oferta.

EJEMPLO BUENO: "Optimicé consultas en \\textbf{PostgreSQL} reduciendo la latencia en 30%, soportando +5K req/día."
EJEMPLO MALO: "Responsable de mantener la base de datos." (tarea, sin impacto, verbo débil)"""

JSON_ADAPTED_USER_PROMPT_TEMPLATE = """### OFERTA DE TRABAJO
{job_description}

### PERFIL DEL CANDIDATO
{profile_context}"""


def _extract_latex_from_response(text: str) -> str:
    """Strip markdown code block if present (```latex ... ``` or ``` ... ```)."""
    if not text or not text.strip():
        return text
    stripped = text.strip()
    match = re.match(r"^```(?:latex)?\s*\n?(.*?)\n?```\s*$", stripped, re.DOTALL)
    if match:
        return match.group(1).strip()
    return stripped


def _extract_json_from_response(text: str) -> str:
    """Strip markdown code block if present (```json ... ``` or ``` ... ```)."""
    if not text or not text.strip():
        return text
    stripped = text.strip()
    match = re.match(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", stripped, re.DOTALL)
    if match:
        return match.group(1).strip()
    return stripped


class GeminiService:
    """Service for generating adapted CV LaTeX via Google Gemini API."""

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        if not (api_key or "").strip():
            raise ValueError("GEMINI_API_KEY / gemini_api_key no configurado")
        self._api_key = api_key.strip()
        self._model = model

    def generate_cv_latex(self, job_description: str, master_cv_content: str) -> str:
        """Generate adapted LaTeX CV for the given job description and master CV content."""
        user_prompt = USER_PROMPT_TEMPLATE.format(
            job_description=job_description,
            master_cv_content=master_cv_content,
        )
        client = genai.Client(api_key=self._api_key)
        response = client.models.generate_content(
            model=self._model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.2,
            ),
        )
        raw = getattr(response, "text", None) or ""
        return _extract_latex_from_response(raw)

    def generate_cv_latex_correct(
        self,
        job_description: str,
        master_cv_content: str,
        previous_latex: str,
        compilation_error_log: str,
    ) -> str:
        """Generate corrected LaTeX given previous failed attempt and Tectonic error log. Task 5.5."""
        user_prompt = CORRECTION_USER_PROMPT_TEMPLATE.format(
            job_description=job_description,
            master_cv_content=master_cv_content,
            previous_latex=previous_latex,
            compilation_error_log=compilation_error_log,
        )
        client = genai.Client(api_key=self._api_key)
        response = client.models.generate_content(
            model=self._model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=CORRECTION_SYSTEM_PROMPT,
                temperature=0.2,
            ),
        )
        raw = getattr(response, "text", None) or ""
        return _extract_latex_from_response(raw)

    def generate_adapted_content_json(
        self, job_description: str, profile: "ProfileData"
    ) -> "AdaptedContent":
        """Generate adapted content as JSON (summary, experience_adapted, projects_adapted, skills_adapted). Task 6.5.4."""
        from app.schemas.adapted_content import AdaptedContent

        profile_context = self._build_profile_context_for_json(profile)
        user_prompt = JSON_ADAPTED_USER_PROMPT_TEMPLATE.format(
            job_description=job_description,
            profile_context=profile_context,
        )
        client = genai.Client(api_key=self._api_key)
        response = client.models.generate_content(
            model=self._model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=JSON_ADAPTED_SYSTEM_PROMPT,
                temperature=0.1,
            ),
        )
        raw = getattr(response, "text", None) or ""
        extracted = _extract_json_from_response(raw)
        try:
            data = json.loads(extracted)
        except json.JSONDecodeError as e:
            raise ValueError(f"Gemini response is not valid JSON: {e}") from e
        return AdaptedContent.model_validate(data)

    def _build_profile_context_for_json(self, profile: "ProfileData") -> str:
        """Build profile context string for the JSON prompt."""
        ctx_parts = [f"Resumen: {profile.summary}"]
        if profile.experience:
            exp_list = [
                f"- {e.id}: {e.role} @ {e.company} | bullets: {e.bullets}"
                for e in profile.experience
            ]
            ctx_parts.append("Experiencia (ids y bullets):\n" + "\n".join(exp_list))
        if profile.projects:
            proj_list = [
                f"- {p.id}: {p.name} | bullets: {p.bullets}"
                for p in profile.projects
            ]
            ctx_parts.append("Proyectos (ids y bullets):\n" + "\n".join(proj_list))
        if profile.skills:
            skills_dict = profile.skills.model_dump(exclude_none=True)
            ctx_parts.append("Skills por categoría: " + json.dumps(skills_dict, ensure_ascii=False))
        return "\n\n".join(ctx_parts)
