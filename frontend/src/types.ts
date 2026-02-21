export type JobStatus = 'NEW' | 'SAVED' | 'DISCARDED' | 'GENERATED' | 'APPLIED' | 'EXPIRED'

export interface Job {
    id: string
    title: string
    company: string
    location: string
    salary?: string
    description: string
    url: string
    source: 'PRACTICAS_PE' | 'COMPUTRABAJO' | 'MANUAL'
    status: JobStatus
    created_at: string
}

export type JobStats = {
    new: number
    saved: number
    generated: number
    applied: number
}

/** Generated CV history item (list view). Backend: GET /api/cvs */
export interface CvHistoryItem {
    id: string
    job_id: string
    job_title: string
    company: string
    source: 'PRACTICAS_PE' | 'COMPUTRABAJO' | 'MANUAL'
    location?: string
    created_at: string
    latex_content?: string
}

/** AI-adapted content for a CV (edit payload). Backend: GET/PATCH /api/cvs/:id/adapted */
export interface ExperienceAdaptedItem {
    experience_id: string
    bullets: string[]
}

export interface ProjectAdaptedItem {
    project_id: string
    bullets: string[]
}

export interface AdaptedContent {
    summary: string
    experience_adapted: ExperienceAdaptedItem[]
    projects_adapted: ProjectAdaptedItem[]
    skills_adapted: Record<string, string[]> | null
}
