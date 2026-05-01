import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, AlertCircle, Save, Plus, Trash2, User, FileText, Briefcase, FolderOpen, GraduationCap, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { profileApi, type ProfileJson } from '@/services/api'

function generateId(prefix: string) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export default function Profile() {
    const [profile, setProfile] = useState<ProfileJson | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [frontendSkill, setFrontendSkill] = useState('')
    const [backendSkill, setBackendSkill] = useState('')
    const [mobileSkill, setMobileSkill] = useState('')
    const [dataMlSkill, setDataMlSkill] = useState('')
    const [infraToolsSkill, setInfraToolsSkill] = useState('')
    const [languagesSkill, setLanguagesSkill] = useState('')

    const loadProfile = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const data = await profileApi.get()
            setProfile(data)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al cargar el perfil')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadProfile()
    }, [])

    const updateProfile = (updater: (p: ProfileJson) => ProfileJson) => {
        if (!profile) return
        setProfile(updater(profile))
        setSaveError(null)
    }

    const handleSave = async () => {
        if (!profile) return
        setIsSaving(true)
        setSaveError(null)
        try {
            await profileApi.update(profile)
            toast.success('Perfil guardado')
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error de conexión. Vuelve a intentar.'
            setSaveError(msg)
            toast.error(msg)
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-8 p-2">
                <PageHeader
                    title="Editar perfil"
                    icon={<User className="h-5 w-5" />}
                />
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="h-12 w-12 mb-4 animate-spin opacity-50" />
                    <p>Cargando perfil...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-8 p-2">
                <PageHeader
                    title="Editar perfil"
                    icon={<User className="h-5 w-5" />}
                />
                <div className="flex flex-col items-center justify-center py-16 text-destructive border border-dashed border-destructive/20 rounded-2xl bg-destructive/5">
                    <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-center px-4">{error}</p>
                    <Button variant="outline" className="mt-4" onClick={loadProfile}>
                        Reintentar
                    </Button>
                </div>
            </div>
        )
    }

    if (!profile) return null

    const skills = profile.skills ?? {}
    const contact = profile.contact
    const links = contact.links ?? {}

    return (
        <div className="space-y-8 p-2 pb-24">
            <PageHeader
                title="Editar perfil"
                icon={<User className="h-5 w-5" />}
                actions={
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="sticky top-2 z-10 bg-accent-gradient hover:opacity-90"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Guardar
                    </Button>
                }
            />

            {saveError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive text-sm">
                    {saveError}
                </div>
            )}

            <SectionCard
                icon={<User className="h-5 w-5" />}
                title="Personal Data"
                description="Manage your public representation."
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Full Name</Label>
                        <Input
                            value={profile.full_name}
                            onChange={e => updateProfile(p => ({ ...p, full_name: e.target.value }))}
                            className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Professional Title</Label>
                        <Input
                            value={profile.title}
                            onChange={e => updateProfile(p => ({ ...p, title: e.target.value }))}
                            className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                            placeholder="Senior Frontend Engineer"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Email Address</Label>
                        <Input
                            type="email"
                            value={contact.email}
                            onChange={e => updateProfile(p => ({
                                ...p,
                                contact: { ...p.contact, email: e.target.value },
                            }))}
                            className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                            placeholder="john@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Location</Label>
                        <Input
                            value={contact.location}
                            onChange={e => updateProfile(p => ({
                                ...p,
                                contact: { ...p.contact, location: e.target.value },
                            }))}
                            className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                            placeholder="Lima, Peru"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Phone</Label>
                        <Input
                            value={contact.phone}
                            onChange={e => updateProfile(p => ({
                                ...p,
                                contact: { ...p.contact, phone: e.target.value },
                            }))}
                            className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                            placeholder="+51 999 123 456"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">LinkedIn</Label>
                        <Input
                            value={links.linkedin ?? ''}
                            onChange={e => updateProfile(p => ({
                                ...p,
                                contact: {
                                    ...p.contact,
                                    links: { ...(p.contact.links ?? {}), linkedin: e.target.value || undefined },
                                },
                            }))}
                            className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                            placeholder="https://linkedin.com/in/username"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">GitHub</Label>
                        <Input
                            value={links.github ?? ''}
                            onChange={e => updateProfile(p => ({
                                ...p,
                                contact: {
                                    ...p.contact,
                                    links: { ...(p.contact.links ?? {}), github: e.target.value || undefined },
                                },
                            }))}
                            className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                            placeholder="https://github.com/username"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Website</Label>
                        <Input
                            value={links.website ?? ''}
                            onChange={e => updateProfile(p => ({
                                ...p,
                                contact: {
                                    ...p.contact,
                                    links: { ...(p.contact.links ?? {}), website: e.target.value || undefined },
                                },
                            }))}
                            className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                            placeholder="https://yourwebsite.com"
                        />
                    </div>
                </div>
            </SectionCard>

            {/* Resumen */}
            <SectionCard
                icon={<FileText className="h-5 w-5" />}
                title="Summary"
            >
                <textarea
                    className="min-h-[140px] w-full rounded-xl border border-white/10 bg-surface/50 px-4 py-3 text-sm text-on-surface placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none transition-colors resize-none"
                    value={profile.summary}
                    onChange={e => updateProfile(p => ({ ...p, summary: e.target.value }))}
                    placeholder="Experienced frontend engineer specializing in React and modern CSS architectures..."
                />
            </SectionCard>

            <SectionCard
                icon={<Briefcase className="h-5 w-5" />}
                title="Skills"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Frontend Stack</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(skills.frontend ?? []).map((skill, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                        {skill}
                                        <button type="button" onClick={() => {
                                            const next = (skills.frontend ?? []).filter((_, j) => j !== i)
                                            updateProfile(p => ({ ...p, skills: { ...p.skills, frontend: next } }))
                                        }} className="hover:text-destructive">×</button>
                                    </span>
                                ))}
                            </div>
                            <Input
                                value={frontendSkill}
                                onChange={e => setFrontendSkill(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === ' ' && frontendSkill.trim()) {
                                        updateProfile(p => ({ ...p, skills: { ...p.skills, frontend: [...(p.skills?.frontend ?? []), frontendSkill.trim()] } }))
                                        setFrontendSkill('')
                                    }
                                }}
                                className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                                placeholder="Type skill + space to add"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Backend & Database</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(skills.backend_db ?? []).map((skill, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20">
                                        {skill}
                                        <button type="button" onClick={() => {
                                            const next = (skills.backend_db ?? []).filter((_, j) => j !== i)
                                            updateProfile(p => ({ ...p, skills: { ...p.skills, backend_db: next } }))
                                        }} className="hover:text-destructive">×</button>
                                    </span>
                                ))}
                            </div>
                            <Input
                                value={backendSkill}
                                onChange={e => setBackendSkill(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === ' ' && backendSkill.trim()) {
                                        updateProfile(p => ({ ...p, skills: { ...p.skills, backend_db: [...(p.skills?.backend_db ?? []), backendSkill.trim()] } }))
                                        setBackendSkill('')
                                    }
                                }}
                                className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                                placeholder="Type skill + space to add"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Mobile & DevOps</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(skills.mobile ?? []).map((skill, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-tertiary/10 text-tertiary border border-tertiary/20">
                                        {skill}
                                        <button type="button" onClick={() => {
                                            const next = (skills.mobile ?? []).filter((_, j) => j !== i)
                                            updateProfile(p => ({ ...p, skills: { ...p.skills, mobile: next } }))
                                        }} className="hover:text-destructive">×</button>
                                    </span>
                                ))}
                            </div>
                            <Input
                                value={mobileSkill}
                                onChange={e => setMobileSkill(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === ' ' && mobileSkill.trim()) {
                                        updateProfile(p => ({ ...p, skills: { ...p.skills, mobile: [...(p.skills?.mobile ?? []), mobileSkill.trim()] } }))
                                        setMobileSkill('')
                                    }
                                }}
                                className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                                placeholder="Type skill + space to add"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Data & ML</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(skills.data_ml ?? []).map((skill, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-outline/10 text-outline border border-outline/20">
                                        {skill}
                                        <button type="button" onClick={() => {
                                            const next = (skills.data_ml ?? []).filter((_, j) => j !== i)
                                            updateProfile(p => ({ ...p, skills: { ...p.skills, data_ml: next } }))
                                        }} className="hover:text-destructive">×</button>
                                    </span>
                                ))}
                            </div>
                            <Input
                                value={dataMlSkill}
                                onChange={e => setDataMlSkill(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === ' ' && dataMlSkill.trim()) {
                                        updateProfile(p => ({ ...p, skills: { ...p.skills, data_ml: [...(p.skills?.data_ml ?? []), dataMlSkill.trim()] } }))
                                        setDataMlSkill('')
                                    }
                                }}
                                className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                                placeholder="Type skill + space to add"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Tools & Practices</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(skills.infra_tools ?? []).map((skill, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary-fixed-dim/10 text-primary-fixed-dim border border-primary-fixed-dim/20">
                                        {skill}
                                        <button type="button" onClick={() => {
                                            const next = (skills.infra_tools ?? []).filter((_, j) => j !== i)
                                            updateProfile(p => ({ ...p, skills: { ...p.skills, infra_tools: next } }))
                                        }} className="hover:text-destructive">×</button>
                                    </span>
                                ))}
                            </div>
                            <Input
                                value={infraToolsSkill}
                                onChange={e => setInfraToolsSkill(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === ' ' && infraToolsSkill.trim()) {
                                        updateProfile(p => ({ ...p, skills: { ...p.skills, infra_tools: [...(p.skills?.infra_tools ?? []), infraToolsSkill.trim()] } }))
                                        setInfraToolsSkill('')
                                    }
                                }}
                                className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                                placeholder="Type skill + space to add"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Languages</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(skills.languages ?? []).map((skill, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-on-surface-variant/10 text-on-surface-variant border border-on-surface-variant/20">
                                        {skill}
                                        <button type="button" onClick={() => {
                                            const next = (skills.languages ?? []).filter((_, j) => j !== i)
                                            updateProfile(p => ({ ...p, skills: { ...p.skills, languages: next } }))
                                        }} className="hover:text-destructive">×</button>
                                    </span>
                                ))}
                            </div>
                            <Input
                                value={languagesSkill}
                                onChange={e => setLanguagesSkill(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === ' ' && languagesSkill.trim()) {
                                        updateProfile(p => ({ ...p, skills: { ...p.skills, languages: [...(p.skills?.languages ?? []), languagesSkill.trim()] } }))
                                        setLanguagesSkill('')
                                    }
                                }}
                                className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors"
                                placeholder="Type skill + space to add"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Languages Spoken</Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateProfile(p => ({
                                ...p,
                                skills: {
                                    ...p.skills,
                                    languages_spoken: [...(p.skills?.languages_spoken ?? []), { name: '', level: '' }],
                                },
                            }))}
                            className="border-white/10 hover:bg-white/5"
                        >
                            <Plus className="h-4 w-4 mr-1" /> Add Language
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {(skills.languages_spoken ?? []).map((lang, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Input
                                    value={lang.name}
                                    onChange={e => {
                                        const next = [...(skills.languages_spoken ?? [])]
                                        next[i] = { ...next[i], name: e.target.value }
                                        updateProfile(p => ({ ...p, skills: { ...p.skills, languages_spoken: next } }))
                                    }}
                                    className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors flex-1"
                                    placeholder="Spanish"
                                />
                                <Input
                                    value={lang.level}
                                    onChange={e => {
                                        const next = [...(skills.languages_spoken ?? [])]
                                        next[i] = { ...next[i], level: e.target.value }
                                        updateProfile(p => ({ ...p, skills: { ...p.skills, languages_spoken: next } }))
                                    }}
                                    className="bg-surface/50 border-white/10 focus:border-primary/50 transition-colors w-32"
                                    placeholder="Native"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        const next = (skills.languages_spoken ?? []).filter((_, j) => j !== i)
                                        updateProfile(p => ({ ...p, skills: { ...p.skills, languages_spoken: next } }))
                                    }}
                                    className="text-outline hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </SectionCard>

            {/* Experiencia */}
            <SectionCard
                icon={<Briefcase className="h-5 w-5" />}
                title="Experience"
            >
                <div className="space-y-6">
                    {profile.experience.map((exp, i) => (
                        <div
                            key={i}
                            className="bg-surface-container-low/50 border border-white/5 rounded-xl p-4 hover:border-primary-container/30 transition-colors group relative"
                        >
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    className="p-1.5 text-outline hover:text-error rounded bg-surface/50"
                                    aria-label="Delete experience"
                                    onClick={() => updateProfile(p => ({
                                        ...p,
                                        experience: p.experience.filter((_, j) => j !== i),
                                    }))}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex justify-between items-start mb-2 pr-12">
                                <div className="space-y-1 flex-1">
                                    <input
                                        value={exp.role}
                                        onChange={e => {
                                            const next = [...profile.experience]
                                            next[i] = { ...next[i], role: e.target.value }
                                            updateProfile(p => ({ ...p, experience: next }))
                                        }}
                                        className="text-lg text-on-surface bg-transparent border-b border-transparent focus:border-primary/50 w-full"
                                        placeholder="Rol"
                                    />
                                    <input
                                        value={exp.company}
                                        onChange={e => {
                                            const next = [...profile.experience]
                                            next[i] = { ...next[i], company: e.target.value }
                                            updateProfile(p => ({ ...p, experience: next }))
                                        }}
                                        className="text-primary-container bg-transparent border-b border-transparent focus:border-primary/50 w-full"
                                        placeholder="Empresa"
                                    />
                                </div>
                                <span className="text-on-surface-variant bg-surface-container px-2 py-1 rounded text-sm shrink-0">
                                    {exp.from || 'Desde'} {exp.to ? ` - ${exp.to}` : (exp.to === 'Present' ? ' - Present' : '')}
                                </span>
                            </div>

                            <div className="grid gap-2 md:grid-cols-2 mt-4">
                                <div className="grid gap-2">
                                    <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Ubicación</Label>
                                    <Input value={exp.location} onChange={e => {
                                        const next = [...profile.experience]
                                        next[i] = { ...next[i], location: e.target.value }
                                        updateProfile(p => ({ ...p, experience: next }))
                                    }} className="bg-surface/50 border-white/10 focus:border-primary/50 text-outline" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Desde</Label>
                                        <Input value={exp.from} onChange={e => {
                                            const next = [...profile.experience]
                                            next[i] = { ...next[i], from: e.target.value }
                                            updateProfile(p => ({ ...p, experience: next }))
                                        }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Hasta</Label>
                                        <Input value={exp.to} onChange={e => {
                                            const next = [...profile.experience]
                                            next[i] = { ...next[i], to: e.target.value }
                                            updateProfile(p => ({ ...p, experience: next }))
                                        }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="space-y-2">
                                    {exp.bullets.map((bullet, j) => (
                                        <div key={j} className="flex items-center gap-2 group">
                                            <span className="text-primary-container">•</span>
                                            <input
                                                value={bullet}
                                                onChange={e => {
                                                    const next = [...profile.experience]
                                                    next[i] = { ...next[i], bullets: next[i].bullets.map((b, idx) => idx === j ? e.target.value : b) }
                                                    updateProfile(p => ({ ...p, experience: next }))
                                                }}
                                                className="flex-1 bg-transparent border-b border-transparent focus:border-primary/50 text-on-surface-variant transition-colors"
                                            />
                                            <button
                                                type="button"
                                                aria-label="delete bullet"
                                                className="opacity-0 group-hover:opacity-100 text-outline hover:text-destructive transition-opacity"
                                                onClick={() => {
                                                    const next = [...profile.experience]
                                                    next[i] = { ...next[i], bullets: next[i].bullets.filter((_, idx) => idx !== j) }
                                                    updateProfile(p => ({ ...p, experience: next }))
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="text-primary text-sm mt-2"
                                    onClick={() => {
                                        const next = [...profile.experience]
                                        next[i] = { ...next[i], bullets: [...next[i].bullets, ''] }
                                        updateProfile(p => ({ ...p, experience: next }))
                                    }}
                                >
                                    + Add bullet
                                </button>
                            </div>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateProfile(p => ({
                            ...p,
                            experience: [...p.experience, {
                                id: generateId('exp'),
                                role: '',
                                company: '',
                                location: '',
                                from: '',
                                to: '',
                                bullets: [],
                            }],
                        }))}
                        className="border-white/10 hover:bg-white/5"
                    >
                        <Plus className="h-4 w-4 mr-1" /> Añadir experiencia
                    </Button>
                </div>
            </SectionCard>

            {/* Proyectos */}
            <SectionCard
                icon={<FolderOpen className="h-5 w-5" />}
                title="Projects"
            >
                <div className="space-y-6">
                    {profile.projects.map((proj, i) => (
                        <div key={i} className="border border-white/10 rounded-xl p-4 space-y-3 bg-surface-container/50">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-on-surface-variant">Proyecto {i + 1}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Delete project"
                                    onClick={() => updateProfile(p => ({
                                        ...p,
                                        projects: p.projects.filter((_, j) => j !== i),
                                    }))}
                                    className="text-outline hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Nombre</Label>
                                    <Input value={proj.name} onChange={e => {
                                        const next = [...profile.projects]
                                        next[i] = { ...next[i], name: e.target.value }
                                        updateProfile(p => ({ ...p, projects: next }))
                                    }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Stack (separado por coma)</Label>
                                    <Input value={proj.stack.join(', ')} onChange={e => {
                                        const next = [...profile.projects]
                                        next[i] = { ...next[i], stack: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                                        updateProfile(p => ({ ...p, projects: next }))
                                    }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-2">
                                    <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Desde</Label>
                                    <Input value={proj.from} onChange={e => {
                                        const next = [...profile.projects]
                                        next[i] = { ...next[i], from: e.target.value }
                                        updateProfile(p => ({ ...p, projects: next }))
                                    }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Hasta</Label>
                                    <Input value={proj.to} onChange={e => {
                                        const next = [...profile.projects]
                                        next[i] = { ...next[i], to: e.target.value }
                                        updateProfile(p => ({ ...p, projects: next }))
                                    }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider" htmlFor={`proj-bullets-${proj.id}`}>Puntos (uno por línea)</Label>
                                <textarea
                                    id={`proj-bullets-${proj.id}`}
                                    aria-label="Puntos de proyecto (uno por línea)"
                                    className="min-h-[80px] w-full rounded-xl border border-white/10 bg-surface/50 px-3 py-2 text-sm text-on-surface placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none transition-colors resize-none mt-2"
                                    value={proj.bullets.join('\n')}
                                    onChange={e => {
                                        const next = [...profile.projects]
                                        next[i] = { ...next[i], bullets: e.target.value.split('\n').filter(Boolean) }
                                        updateProfile(p => ({ ...p, projects: next }))
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateProfile(p => ({
                            ...p,
                            projects: [...p.projects, {
                                id: generateId('proj'),
                                name: '',
                                stack: [],
                                from: '',
                                to: '',
                                bullets: [],
                            }],
                        }))}
                        className="border-white/10 hover:bg-white/5"
                    >
                        <Plus className="h-4 w-4 mr-1" /> Añadir proyecto
                    </Button>
                </div>
            </SectionCard>

{/* Educación */}
            <SectionCard
                icon={<GraduationCap className="h-5 w-5" />}
                title="Education"
            >
                <div className="space-y-6">
                    {profile.education.map((edu, i) => (
                        <div key={i} className="border border-white/10 rounded-xl p-4 space-y-3 bg-surface-container/50">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-on-surface-variant">Educación {i + 1}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Delete education"
                                    onClick={() => updateProfile(p => ({
                                        ...p,
                                        education: p.education.filter((_, j) => j !== i),
                                    }))}
                                    className="text-outline hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Institución</Label>
                                    <Input value={edu.institution} onChange={e => {
                                        const next = [...profile.education]
                                        next[i] = { ...next[i], institution: e.target.value }
                                        updateProfile(p => ({ ...p, education: next }))
                                    }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Ubicación</Label>
                                    <Input value={edu.location} onChange={e => {
                                        const next = [...profile.education]
                                        next[i] = { ...next[i], location: e.target.value }
                                        updateProfile(p => ({ ...p, education: next }))
                                    }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                                </div>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Título / Grado</Label>
                                    <Input value={edu.degree} onChange={e => {
                                        const next = [...profile.education]
                                        next[i] = { ...next[i], degree: e.target.value }
                                        updateProfile(p => ({ ...p, education: next }))
                                    }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Desde</Label>
                                        <Input value={edu.from} onChange={e => {
                                            const next = [...profile.education]
                                            next[i] = { ...next[i], from: e.target.value }
                                            updateProfile(p => ({ ...p, education: next }))
                                        }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Hasta</Label>
                                        <Input value={edu.to} onChange={e => {
                                            const next = [...profile.education]
                                            next[i] = { ...next[i], to: e.target.value }
                                            updateProfile(p => ({ ...p, education: next }))
                                        }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateProfile(p => ({
                            ...p,
                            education: [...p.education, { institution: '', location: '', degree: '', from: '', to: '' }],
                        }))}
                        className="border-white/10 hover:bg-white/5"
                    >
                        <Plus className="h-4 w-4 mr-1" /> Añadir educación
                    </Button>
                </div>
            </SectionCard>

            {/* Certificaciones */}
            <SectionCard
                icon={<Award className="h-5 w-5" />}
                title="Certifications"
            >
                <div className="space-y-6">
                    {profile.certifications.map((cert, i) => (
                        <div key={i} className="border border-white/10 rounded-xl p-4 space-y-3 bg-surface-container/50">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-on-surface-variant">Certificación {i + 1}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Delete certification"
                                    onClick={() => updateProfile(p => ({ ...p, certifications: p.certifications.filter((_, j) => j !== i) }))}
                                    className="text-outline hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Nombre</Label>
                                    <Input value={cert.name} onChange={e => {
                                        const next = [...profile.certifications]
                                        next[i] = { ...next[i], name: e.target.value }
                                        updateProfile(p => ({ ...p, certifications: next }))
                                    }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Emisor</Label>
                                    <Input value={cert.issuer} onChange={e => {
                                        const next = [...profile.certifications]
                                        next[i] = { ...next[i], issuer: e.target.value }
                                        updateProfile(p => ({ ...p, certifications: next }))
                                    }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Descripción</Label>
                                <Input value={cert.description} onChange={e => {
                                    const next = [...profile.certifications]
                                    next[i] = { ...next[i], description: e.target.value }
                                    updateProfile(p => ({ ...p, certifications: next }))
                                }} className="bg-surface/50 border-white/10 focus:border-primary/50" />
                            </div>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateProfile(p => ({
                            ...p,
                            certifications: [...p.certifications, { name: '', issuer: '', description: '' }],
                        }))}
                        className="border-white/10 hover:bg-white/5"
                    >
                        <Plus className="h-4 w-4 mr-1" /> Añadir certificación
                    </Button>
                </div>
            </SectionCard>
        </div>
    )
}
