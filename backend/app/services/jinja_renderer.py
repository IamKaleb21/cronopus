"""
Jinja template renderer for LaTeX CV (Task 6.5.3).
Renders LaTeX + Jinja with profile and adapted context.
"""
from jinja2 import Environment

from app.schemas.profile_data import ProfileData
from app.schemas.adapted_content import AdaptedContent
from app.services.latex_sanitizer import sanitize_dict_for_latex


def merge_profile_with_adapted(profile: ProfileData, adapted: AdaptedContent) -> dict:
    """
    Build effective CV context from profile + adapted.
    When adapted has content, use it (filtered experience/projects, adapted skills).
    When adapted is empty, use profile values.
    """
    has_adapted = (
        bool(adapted.summary)
        or bool(adapted.experience_adapted)
        or bool(adapted.projects_adapted)
        or adapted.skills_adapted is not None
    )
    if not has_adapted:
        profile_dump = profile.model_dump(by_alias=True)
        return {
            "summary": profile_dump["summary"],
            "experience": profile_dump["experience"],
            "projects": profile_dump["projects"],
            "skills": profile_dump["skills"],
        }
    # Build from merge
    summary = adapted.summary if adapted.summary else profile.summary
    profile_exp_by_id = {e.id: e for e in profile.experience}
    profile_proj_by_id = {p.id: p for p in profile.projects}
    experience: list[dict] = []
    if adapted.experience_adapted:
        for ea in adapted.experience_adapted:
            exp = profile_exp_by_id.get(ea.experience_id)
            if exp:
                d = exp.model_dump(by_alias=True)
                d["bullets"] = ea.bullets
                experience.append(d)
    else:
        experience = [e.model_dump(by_alias=True) for e in profile.experience]
    projects: list[dict] = []
    if adapted.projects_adapted:
        for pa in adapted.projects_adapted:
            proj = profile_proj_by_id.get(pa.project_id)
            if proj:
                d = proj.model_dump(by_alias=True)
                d["bullets"] = pa.bullets
                projects.append(d)
    else:
        projects = [p.model_dump(by_alias=True) for p in profile.projects]
    skills: dict = {}
    if adapted.skills_adapted is not None:
        skills = dict(adapted.skills_adapted)
    else:
        skills = profile.skills.model_dump(exclude_none=True)
    if profile.skills.languages_spoken:
        lang_list = [ls.model_dump() for ls in profile.skills.languages_spoken]
        skills["languages_spoken"] = lang_list
    return {"summary": summary, "experience": experience, "projects": projects, "skills": skills}


def render_jinja_template(
    template_content: str,
    profile: ProfileData,
    adapted: AdaptedContent,
) -> str:
    """
    Render Jinja template with profile and adapted context.
    Builds cv (effective CV) via merge_profile_with_adapted.
    Returns LaTeX string.
    """
    cv = merge_profile_with_adapted(profile, adapted)
    profile_dump = profile.model_dump(by_alias=True)
    # URLs sin sanitizar para \href (evita que % _ # & rompan el enlace en el PDF)
    profile_links_raw = (profile_dump.get("contact") or {}).get("links") or {}
    profile_sanitized = sanitize_dict_for_latex(profile_dump)
    cv_sanitized = sanitize_dict_for_latex(cv)
    env = Environment(autoescape=False)
    tpl = env.from_string(template_content)
    ctx = {
        "profile": profile_sanitized,
        "profile_links_raw": profile_links_raw,
        "adapted": adapted.model_dump(),
        "cv": cv_sanitized,
    }
    return tpl.render(**ctx)
