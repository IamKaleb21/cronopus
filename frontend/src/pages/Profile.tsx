import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, AlertCircle, Save, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
                <h1 className="text-3xl font-extrabold text-gradient w-fit">Editar perfil</h1>
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
                <h1 className="text-3xl font-extrabold text-gradient w-fit">Editar perfil</h1>
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
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-extrabold text-gradient w-fit">Editar perfil</h1>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="sticky top-2 z-10 bg-accent-gradient hover:opacity-90"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar
                </Button>
            </div>

            {saveError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive text-sm">
                    {saveError}
                </div>
            )}

            {/* Datos básicos */}
            <Card className="group relative overflow-hidden rounded-[20px] bg-card border-border">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-accent-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden />
                <CardHeader>
                    <CardTitle>Datos básicos</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Nombre completo</Label>
                        <Input
                            value={profile.full_name}
                            onChange={e => updateProfile(p => ({ ...p, full_name: e.target.value }))}
                            placeholder="Nombre completo"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Título profesional</Label>
                        <Input
                            value={profile.title}
                            onChange={e => updateProfile(p => ({ ...p, title: e.target.value }))}
                            placeholder="Título"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Teléfono</Label>
                        <Input
                            value={contact.phone}
                            onChange={e => updateProfile(p => ({
                                ...p,
                                contact: { ...p.contact, phone: e.target.value },
                            }))}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input
                            type="email"
                            value={contact.email}
                            onChange={e => updateProfile(p => ({
                                ...p,
                                contact: { ...p.contact, email: e.target.value },
                            }))}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Ubicación</Label>
                        <Input
                            value={contact.location}
                            onChange={e => updateProfile(p => ({
                                ...p,
                                contact: { ...p.contact, location: e.target.value },
                            }))}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>LinkedIn</Label>
                        <Input
                            value={links.linkedin ?? ''}
                            onChange={e => updateProfile(p => ({
                                ...p,
                                contact: {
                                    ...p.contact,
                                    links: { ...(p.contact.links ?? {}), linkedin: e.target.value || undefined },
                                },
                            }))}
                            placeholder="https://linkedin.com/in/..."
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>GitHub</Label>
                        <Input
                            value={links.github ?? ''}
                            onChange={e => updateProfile(p => ({
                                ...p,
                                contact: {
                                    ...p.contact,
                                    links: { ...(p.contact.links ?? {}), github: e.target.value || undefined },
                                },
                            }))}
                            placeholder="https://github.com/..."
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Web</Label>
                        <Input
                            value={links.website ?? ''}
                            onChange={e => updateProfile(p => ({
                                ...p,
                                contact: {
                                    ...p.contact,
                                    links: { ...(p.contact.links ?? {}), website: e.target.value || undefined },
                                },
                            }))}
                            placeholder="https://..."
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Resumen */}
            <Card className="group relative overflow-hidden rounded-[20px] bg-card border-border">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-accent-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden />
                <CardHeader>
                    <CardTitle>Resumen</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2">
                        <Label>Resumen profesional</Label>
                        <textarea
                            className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={profile.summary}
                            onChange={e => updateProfile(p => ({ ...p, summary: e.target.value }))}
                            placeholder="Resumen..."
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Skills (simplified: one textarea per list, newline-separated) */}
            <Card className="group relative overflow-hidden rounded-[20px] bg-card border-border">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-accent-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden />
                <CardHeader>
                    <CardTitle>Skills</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(['languages', 'frontend', 'backend_db', 'mobile', 'data_ml', 'infra_tools', 'libraries'] as const).map(key => (
                        <div key={key} className="grid gap-2">
                            <Label>{key.replace('_', ' ')}</Label>
                            <Input
                                value={(skills[key] ?? []).join(', ')}
                                onChange={e => updateProfile(p => ({
                                    ...p,
                                    skills: {
                                        ...p.skills,
                                        [key]: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                                    },
                                }))}
                                placeholder="Separados por coma"
                            />
                        </div>
                    ))}
                    <div className="grid gap-2 md:col-span-2 lg:col-span-3">
                        <Label>Idiomas</Label>
                        {(skills.languages_spoken ?? []).map((lang, i) => (
                            <div key={i} className="flex gap-2 mt-2">
                                <Input
                                    value={lang.name}
                                    onChange={e => {
                                        const next = [...(skills.languages_spoken ?? [])]
                                        next[i] = { ...next[i], name: e.target.value }
                                        updateProfile(p => ({ ...p, skills: { ...p.skills, languages_spoken: next } }))
                                    }}
                                    placeholder="Idioma"
                                />
                                <Input
                                    value={lang.level}
                                    onChange={e => {
                                        const next = [...(skills.languages_spoken ?? [])]
                                        next[i] = { ...next[i], level: e.target.value }
                                        updateProfile(p => ({ ...p, skills: { ...p.skills, languages_spoken: next } }))
                                    }}
                                    placeholder="Nivel"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        const next = (skills.languages_spoken ?? []).filter((_, j) => j !== i)
                                        updateProfile(p => ({ ...p, skills: { ...p.skills, languages_spoken: next } }))
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => updateProfile(p => ({
                                ...p,
                                skills: {
                                    ...p.skills,
                                    languages_spoken: [...(p.skills?.languages_spoken ?? []), { name: '', level: '' }],
                                },
                            }))}
                        >
                            <Plus className="h-4 w-4 mr-1" /> Añadir idioma
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Experiencia */}
            <Card className="group relative overflow-hidden rounded-[20px] bg-card border-border">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-accent-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden />
                <CardHeader>
                    <CardTitle>Experiencia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {profile.experience.map((exp, i) => (
                        <div key={exp.id} className="border border-border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Experiencia {i + 1}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateProfile(p => ({
                                        ...p,
                                        experience: p.experience.filter((_, j) => j !== i),
                                    }))}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="grid gap-2"><Label>Rol</Label><Input value={exp.role} onChange={e => {
                                    const next = [...profile.experience]
                                    next[i] = { ...next[i], role: e.target.value }
                                    updateProfile(p => ({ ...p, experience: next }))
                                }} /></div>
                                <div className="grid gap-2"><Label>Empresa</Label><Input value={exp.company} onChange={e => {
                                    const next = [...profile.experience]
                                    next[i] = { ...next[i], company: e.target.value }
                                    updateProfile(p => ({ ...p, experience: next }))
                                }} /></div>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="grid gap-2"><Label>Ubicación</Label><Input value={exp.location} onChange={e => {
                                    const next = [...profile.experience]
                                    next[i] = { ...next[i], location: e.target.value }
                                    updateProfile(p => ({ ...p, experience: next }))
                                }} /></div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><Label>Desde</Label><Input value={exp.from} onChange={e => {
                                        const next = [...profile.experience]
                                        next[i] = { ...next[i], from: e.target.value }
                                        updateProfile(p => ({ ...p, experience: next }))
                                    }} /></div>
                                    <div><Label>Hasta</Label><Input value={exp.to} onChange={e => {
                                        const next = [...profile.experience]
                                        next[i] = { ...next[i], to: e.target.value }
                                        updateProfile(p => ({ ...p, experience: next }))
                                    }} /></div>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor={`exp-bullets-${exp.id}`}>Bullets (uno por línea)</Label>
                                <textarea
                                    id={`exp-bullets-${exp.id}`}
                                    aria-label="Bullets de experiencia (uno por línea)"
                                    className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={exp.bullets.join('\n')}
                                    onChange={e => {
                                        const next = [...profile.experience]
                                        next[i] = { ...next[i], bullets: e.target.value.split('\n').filter(Boolean) }
                                        updateProfile(p => ({ ...p, experience: next }))
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
                    >
                        <Plus className="h-4 w-4 mr-1" /> Añadir experiencia
                    </Button>
                </CardContent>
            </Card>

            {/* Proyectos */}
            <Card className="group relative overflow-hidden rounded-[20px] bg-card border-border">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-accent-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden />
                <CardHeader>
                    <CardTitle>Proyectos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {profile.projects.map((proj, i) => (
                        <div key={proj.id} className="border border-border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Proyecto {i + 1}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateProfile(p => ({ ...p, projects: p.projects.filter((_, j) => j !== i) }))}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="grid gap-2"><Label>Nombre</Label><Input value={proj.name} onChange={e => {
                                    const next = [...profile.projects]
                                    next[i] = { ...next[i], name: e.target.value }
                                    updateProfile(p => ({ ...p, projects: next }))
                                }} /></div>
                                <div className="grid gap-2"><Label>Stack (separado por coma)</Label><Input value={proj.stack.join(', ')} onChange={e => {
                                    const next = [...profile.projects]
                                    next[i] = { ...next[i], stack: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                                    updateProfile(p => ({ ...p, projects: next }))
                                }} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><Label>Desde</Label><Input value={proj.from} onChange={e => {
                                    const next = [...profile.projects]
                                    next[i] = { ...next[i], from: e.target.value }
                                    updateProfile(p => ({ ...p, projects: next }))
                                }} /></div>
                                <div><Label>Hasta</Label><Input value={proj.to} onChange={e => {
                                    const next = [...profile.projects]
                                    next[i] = { ...next[i], to: e.target.value }
                                    updateProfile(p => ({ ...p, projects: next }))
                                }} /></div>
                            </div>
                            <div>
                                <Label htmlFor={`proj-bullets-${proj.id}`}>Bullets (uno por línea)</Label>
                                <textarea
                                    id={`proj-bullets-${proj.id}`}
                                    aria-label="Bullets de proyecto (uno por línea)"
                                    className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    >
                        <Plus className="h-4 w-4 mr-1" /> Añadir proyecto
                    </Button>
                </CardContent>
            </Card>

            {/* Educación */}
            <Card className="group relative overflow-hidden rounded-[20px] bg-card border-border">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-accent-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden />
                <CardHeader>
                    <CardTitle>Educación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {profile.education.map((edu, i) => (
                        <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Educación {i + 1}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateProfile(p => ({ ...p, education: p.education.filter((_, j) => j !== i) }))}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="grid gap-2"><Label>Institución</Label><Input value={edu.institution} onChange={e => {
                                    const next = [...profile.education]
                                    next[i] = { ...next[i], institution: e.target.value }
                                    updateProfile(p => ({ ...p, education: next }))
                                }} /></div>
                                <div className="grid gap-2"><Label>Ubicación</Label><Input value={edu.location} onChange={e => {
                                    const next = [...profile.education]
                                    next[i] = { ...next[i], location: e.target.value }
                                    updateProfile(p => ({ ...p, education: next }))
                                }} /></div>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="grid gap-2"><Label>Título / Grado</Label><Input value={edu.degree} onChange={e => {
                                    const next = [...profile.education]
                                    next[i] = { ...next[i], degree: e.target.value }
                                    updateProfile(p => ({ ...p, education: next }))
                                }} /></div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><Label>Desde</Label><Input value={edu.from} onChange={e => {
                                        const next = [...profile.education]
                                        next[i] = { ...next[i], from: e.target.value }
                                        updateProfile(p => ({ ...p, education: next }))
                                    }} /></div>
                                    <div><Label>Hasta</Label><Input value={edu.to} onChange={e => {
                                        const next = [...profile.education]
                                        next[i] = { ...next[i], to: e.target.value }
                                        updateProfile(p => ({ ...p, education: next }))
                                    }} /></div>
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
                    >
                        <Plus className="h-4 w-4 mr-1" /> Añadir educación
                    </Button>
                </CardContent>
            </Card>

            {/* Certificaciones */}
            <Card className="group relative overflow-hidden rounded-[20px] bg-card border-border">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-accent-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden />
                <CardHeader>
                    <CardTitle>Certificaciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {profile.certifications.map((cert, i) => (
                        <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Certificación {i + 1}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateProfile(p => ({ ...p, certifications: p.certifications.filter((_, j) => j !== i) }))}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="grid gap-2"><Label>Nombre</Label><Input value={cert.name} onChange={e => {
                                    const next = [...profile.certifications]
                                    next[i] = { ...next[i], name: e.target.value }
                                    updateProfile(p => ({ ...p, certifications: next }))
                                }} /></div>
                                <div className="grid gap-2"><Label>Emisor</Label><Input value={cert.issuer} onChange={e => {
                                    const next = [...profile.certifications]
                                    next[i] = { ...next[i], issuer: e.target.value }
                                    updateProfile(p => ({ ...p, certifications: next }))
                                }} /></div>
                            </div>
                            <div><Label>Descripción</Label><Input value={cert.description} onChange={e => {
                                const next = [...profile.certifications]
                                next[i] = { ...next[i], description: e.target.value }
                                updateProfile(p => ({ ...p, certifications: next }))
                            }} /></div>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateProfile(p => ({
                            ...p,
                            certifications: [...p.certifications, { name: '', issuer: '', description: '' }],
                        }))}
                    >
                        <Plus className="h-4 w-4 mr-1" /> Añadir certificación
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
