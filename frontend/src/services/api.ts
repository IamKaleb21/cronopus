import axios from 'axios'
import type { Job, JobStatus, CvHistoryItem } from '@/types'
import { getStoredToken, clearStoredToken } from '@/lib/auth'

/** Response from GET /api/templates/active (content + id for save). */
export interface TemplateActive {
    content: string
    id: string
}

/** Profile JSON (same shape as docs/profile.json). Used by GET/PATCH /api/profile. */
export interface ProfileContactLinks {
    linkedin?: string
    github?: string
    website?: string
}
export interface ProfileContact {
    phone: string
    email: string
    location: string
    links?: ProfileContactLinks
}
export interface ProfileLanguageSpoken {
    name: string
    level: string
    note?: string
}
export interface ProfileSkills {
    languages?: string[]
    frontend?: string[]
    backend_db?: string[]
    mobile?: string[]
    data_ml?: string[]
    infra_tools?: string[]
    libraries?: string[]
    languages_spoken?: ProfileLanguageSpoken[]
}
export interface ProfileExperienceItem {
    id: string
    role: string
    company: string
    location: string
    from: string
    to: string
    bullets: string[]
}
export interface ProfileProjectItem {
    id: string
    name: string
    stack: string[]
    from: string
    to: string
    bullets: string[]
}
export interface ProfileEducationItem {
    institution: string
    location: string
    degree: string
    from: string
    to: string
}
export interface ProfileCertificationItem {
    name: string
    issuer: string
    description: string
}
export interface ProfileJson {
    id?: string
    full_name: string
    title: string
    contact: ProfileContact
    summary: string
    skills: ProfileSkills
    experience: ProfileExperienceItem[]
    projects: ProfileProjectItem[]
    education: ProfileEducationItem[]
    certifications: ProfileCertificationItem[]
}

/** Normalize API error detail to a string for Error(). Safe for detail of type unknown. */
function apiDetailMessage(detail: unknown, fallback: string): string {
    return typeof detail === 'string' ? detail : fallback
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

apiClient.interceptors.request.use(config => {
    const token = getStoredToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

apiClient.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) clearStoredToken()
        return Promise.reject(err)
    }
)

export const profileApi = {
    get: async (): Promise<ProfileJson> => {
        try {
            const { data } = await apiClient.get<ProfileJson>('/api/profile')
            return data
        } catch (err: unknown) {
            const res = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response
            if (res?.status === 503) throw new Error(apiDetailMessage(res?.data?.detail, 'Perfil no configurado. Ejecuta seed_profile.'))
            if (res?.status === 422) throw new Error(apiDetailMessage(res?.data?.detail, 'Datos inválidos.'))
            throw err
        }
    },
    update: async (body: ProfileJson): Promise<ProfileJson> => {
        try {
            const { data } = await apiClient.patch<ProfileJson>('/api/profile', body)
            return data
        } catch (err: unknown) {
            const res = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response
            if (res?.status === 503) throw new Error(apiDetailMessage(res?.data?.detail, 'Perfil no configurado. Ejecuta seed_profile.'))
            if (res?.status === 422) throw new Error(apiDetailMessage(res?.data?.detail, 'Datos inválidos.'))
            throw err
        }
    },
}

export const authApi = {
    login: async (password: string): Promise<{ token: string }> => {
        const { data } = await apiClient.post<{ token: string }>('/api/auth/login', { password })
        return data
    },
    verify: async (): Promise<{ valid: boolean }> => {
        const { data } = await apiClient.get<{ valid: boolean }>('/api/auth/verify')
        return data
    },
}

export const jobsApi = {
    /**
     * Fetch all jobs from backend.
     * GET /api/jobs
     */
    getAll: async (): Promise<Job[]> => {
        const { data } = await apiClient.get<Job[]>('/api/jobs')
        return data
    },

    /**
     * Create a manual job.
     * POST /api/jobs. Task 4.8.
     */
    create: async (body: {
        title: string
        company: string
        location: string
        description: string
        url: string
        salary?: string | null
    }): Promise<Job> => {
        const { data } = await apiClient.post<Job>('/api/jobs', body)
        return data
    },

    /**
     * Update a job's status.
     * PATCH /api/jobs/:id
     */
    updateStatus: async (jobId: string, status: JobStatus): Promise<Job> => {
        const { data } = await apiClient.patch<Job>(`/api/jobs/${jobId}`, { status })
        return data
    },

    /**
     * Compile template (LaTeX + Jinja) with profile context into a PDF.
     * POST /api/compile-template
     */
    compileTemplate: async (content: string): Promise<Blob> => {
        try {
            const { data } = await apiClient.post<Blob>('/api/compile-template', { content }, { responseType: 'blob' })
            return data
        } catch (err: unknown) {
            const response = (err as { response?: { data?: Blob; headers?: { 'content-type'?: string } } })?.response
            const contentType = response?.headers?.['content-type'] ?? ''
            if (response?.data instanceof Blob && contentType.includes('application/json')) {
                const text = await response.data.text()
                try {
                    const json = JSON.parse(text) as { detail?: string }
                    if (typeof json.detail === 'string') throw new Error(json.detail)
                } catch (e) {
                    if (e instanceof Error) throw e
                }
            }
            throw err
        }
    },

    /**
     * Compile raw LaTeX content into a PDF (legacy).
     * POST /api/compile
     */
    compileLatex: async (content: string): Promise<Blob> => {
        try {
            const { data } = await apiClient.post<Blob>('/api/compile', { content }, { responseType: 'blob' })
            return data
        } catch (err: unknown) {
            const response = (err as { response?: { data?: Blob; headers?: { 'content-type'?: string } } })?.response
            const contentType = response?.headers?.['content-type'] ?? ''
            if (response?.data instanceof Blob && contentType.includes('application/json')) {
                const text = await response.data.text()
                try {
                    const json = JSON.parse(text) as { detail?: string }
                    if (typeof json.detail === 'string') throw new Error(json.detail)
                } catch (e) {
                    if (e instanceof Error) throw e
                }
            }
            throw err
        }
    },

    /**
     * Generate a CV for a specific job using AI.
     * POST /api/generate-cv with body { job_id, template_id? }. Uses active template if template_id omitted.
     */
    generateCv: async (jobId: string): Promise<Blob> => {
        const { data } = await apiClient.post<Blob>('/api/generate-cv', { job_id: jobId }, {
            responseType: 'blob',
        })
        return data
    },

    /**
     * Get the active CV template (content + id for save).
     * GET /api/templates/active
     */
    getTemplate: async (): Promise<TemplateActive> => {
        const { data } = await apiClient.get<{ content: string; id: string }>('/api/templates/active')
        return { content: data.content, id: data.id }
    },

    /**
     * Save the master CV template content.
     * PUT /api/templates/:id
     */
    saveTemplate: async (content: string, templateId: string): Promise<void> => {
        await apiClient.put(`/api/templates/${templateId}`, { content })
    },
}

/** CV history list and recompile. GET /api/cvs, POST /api/cvs/:id/recompile */
export const cvsApi = {
    getList: async (params?: { company?: string; from?: string; to?: string }): Promise<CvHistoryItem[]> => {
        const requestParams: Record<string, string> = {}
        if (params?.company?.trim()) requestParams.company = params.company.trim()
        if (params?.from) requestParams.from = params.from
        if (params?.to) requestParams.to = params.to
        const { data } = await apiClient.get<CvHistoryItem[]>('/api/cvs', { params: requestParams })
        return data
    },
    recompile: async (id: string): Promise<Blob> => {
        try {
            const { data } = await apiClient.post<Blob>(`/api/cvs/${id}/recompile`, undefined, { responseType: 'blob' })
            return data
        } catch (err: unknown) {
            const response = (err as { response?: { data?: Blob; headers?: { 'content-type'?: string } } })?.response
            const contentType = response?.headers?.['content-type'] ?? ''
            if (response?.data instanceof Blob && contentType.includes('application/json')) {
                const text = await response.data.text()
                try {
                    const json = JSON.parse(text) as { detail?: string }
                    if (typeof json.detail === 'string') throw new Error(json.detail)
                } catch (e) {
                    if (e instanceof Error) throw e
                }
            }
            throw err
        }
    },
}

export default apiClient
