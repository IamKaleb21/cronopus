import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, AlertCircle, Save, Plus, Trash2, FileOutput } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cvsApi } from '@/services/api'
import type { AdaptedContent } from '@/types'

export default function EditGeneratedCv() {
    const { id: cvId } = useParams<{ id: string }>()
    const [content, setContent] = useState<AdaptedContent | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [recompiling, setRecompiling] = useState(false)

    useEffect(() => {
        if (!cvId) return
        let cancelled = false
        setIsLoading(true)
        setError(null)
        cvsApi
            .getAdapted(cvId)
            .then((data) => {
                if (!cancelled) setContent(data)
            })
            .catch((e) => {
                if (!cancelled) {
                    const msg = e?.response?.status === 404
                        ? 'Este CV no se puede editar (generado antes de esta función).'
                        : (e instanceof Error ? e.message : 'Error al cargar.')
                    setError(msg)
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [cvId])

    const updateContent = (updater: (c: AdaptedContent) => AdaptedContent) => {
        if (!content) return
        setContent(updater(content))
        setSaveError(null)
    }

    const handleSave = async () => {
        if (!content || !cvId) return
        setIsSaving(true)
        setSaveError(null)
        try {
            await cvsApi.updateAdapted(cvId, content)
            toast.success('Contenido guardado')
            setSaved(true)
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error al guardar. Vuelve a intentar.'
            setSaveError(msg)
            toast.error(msg)
        } finally {
            setIsSaving(false)
        }
    }

    const handleRecompile = async () => {
        if (!cvId) return
        setRecompiling(true)
        try {
            const blob = await cvsApi.recompile(cvId)
            const url = URL.createObjectURL(blob)
            window.open(url, '_blank')
            setTimeout(() => URL.revokeObjectURL(url), 60000)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al recompilar')
        } finally {
            setRecompiling(false)
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-8 p-2">
                <h1 className="text-3xl font-extrabold text-gradient w-fit">Editar contenido adaptado</h1>
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="h-12 w-12 mb-4 animate-spin opacity-50" />
                    <p>Cargando...</p>
                </div>
            </div>
        )
    }

    if (error || !content) {
        return (
            <div className="space-y-8 p-2">
                <h1 className="text-3xl font-extrabold text-gradient w-fit">Editar contenido adaptado</h1>
                <div className="flex flex-col items-center justify-center py-16 text-destructive border border-dashed border-destructive/20 rounded-2xl bg-destructive/5">
                    <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-center px-4">{error ?? 'CV no encontrado'}</p>
                    <Button variant="outline" className="mt-4" asChild>
                        <Link to="/generated-cvs">Volver a CVs Generados</Link>
                    </Button>
                </div>
            </div>
        )
    }

    const skills = content.skills_adapted ?? {}
    const skillKeys = Object.keys(skills)

    return (
        <div className="space-y-8 p-2 pb-24">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild>
                        <Link to="/generated-cvs">← Volver a CVs Generados</Link>
                    </Button>
                    <h1 className="text-3xl font-extrabold text-gradient w-fit">Editar contenido adaptado</h1>
                </div>
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

            {/* Resumen */}
            <Card className="group relative overflow-hidden rounded-[20px] bg-card border-border">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-accent-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden />
                <CardHeader>
                    <CardTitle>Resumen</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2">
                        <Label>Resumen profesional adaptado</Label>
                        <textarea
                            className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={content.summary}
                            onChange={(e) => updateContent((c) => ({ ...c, summary: e.target.value }))}
                            placeholder="Resumen..."
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Experiencia adaptada */}
            <Card className="group relative overflow-hidden rounded-[20px] bg-card border-border">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-accent-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden />
                <CardHeader>
                    <CardTitle>Experiencia adaptada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {content.experience_adapted.map((item, i) => (
                        <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Experiencia {i + 1}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        updateContent((c) => ({
                                            ...c,
                                            experience_adapted: c.experience_adapted.filter((_, j) => j !== i),
                                        }))
                                    }
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>ID experiencia</Label>
                                    <Input
                                        value={item.experience_id}
                                        onChange={(e) => {
                                            const next = [...content.experience_adapted]
                                            next[i] = { ...next[i], experience_id: e.target.value }
                                            updateContent((c) => ({ ...c, experience_adapted: next }))
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor={`exp-bullets-${i}`}>Bullets (uno por línea)</Label>
                                <textarea
                                    id={`exp-bullets-${i}`}
                                    aria-label="Bullets de experiencia (uno por línea)"
                                    className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={item.bullets.join('\n')}
                                    onChange={(e) => {
                                        const next = [...content.experience_adapted]
                                        next[i] = { ...next[i], bullets: e.target.value.split('\n').filter(Boolean) }
                                        updateContent((c) => ({ ...c, experience_adapted: next }))
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            updateContent((c) => ({
                                ...c,
                                experience_adapted: [...c.experience_adapted, { experience_id: '', bullets: [] }],
                            }))
                        }
                    >
                        <Plus className="h-4 w-4 mr-1" /> Añadir experiencia
                    </Button>
                </CardContent>
            </Card>

            {/* Proyectos adaptados */}
            <Card className="group relative overflow-hidden rounded-[20px] bg-card border-border">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-accent-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden />
                <CardHeader>
                    <CardTitle>Proyectos adaptados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {content.projects_adapted.map((item, i) => (
                        <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Proyecto {i + 1}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        updateContent((c) => ({
                                            ...c,
                                            projects_adapted: c.projects_adapted.filter((_, j) => j !== i),
                                        }))
                                    }
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>ID proyecto</Label>
                                    <Input
                                        value={item.project_id}
                                        onChange={(e) => {
                                            const next = [...content.projects_adapted]
                                            next[i] = { ...next[i], project_id: e.target.value }
                                            updateContent((c) => ({ ...c, projects_adapted: next }))
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor={`proj-bullets-${i}`}>Bullets (uno por línea)</Label>
                                <textarea
                                    id={`proj-bullets-${i}`}
                                    aria-label="Bullets de proyecto (uno por línea)"
                                    className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={item.bullets.join('\n')}
                                    onChange={(e) => {
                                        const next = [...content.projects_adapted]
                                        next[i] = { ...next[i], bullets: e.target.value.split('\n').filter(Boolean) }
                                        updateContent((c) => ({ ...c, projects_adapted: next }))
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            updateContent((c) => ({
                                ...c,
                                projects_adapted: [...c.projects_adapted, { project_id: '', bullets: [] }],
                            }))
                        }
                    >
                        <Plus className="h-4 w-4 mr-1" /> Añadir proyecto
                    </Button>
                </CardContent>
            </Card>

            {/* Skills adaptadas */}
            <Card className="group relative overflow-hidden rounded-[20px] bg-card border-border">
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-accent-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden />
                <CardHeader>
                    <CardTitle>Skills adaptadas</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {skillKeys.length === 0 ? (
                        <p className="text-muted-foreground text-sm col-span-full">Sin categorías. Añade una abajo.</p>
                    ) : (
                        skillKeys.map((key) => (
                            <div key={key} className="grid gap-2">
                                <Label>{key}</Label>
                                <Input
                                    value={(skills[key] ?? []).join(', ')}
                                    onChange={(e) => {
                                        const next = { ...skills, [key]: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }
                                        updateContent((c) => ({ ...c, skills_adapted: next }))
                                    }}
                                    placeholder="Separados por coma"
                                />
                            </div>
                        ))
                    )}
                    <div className="grid gap-2 md:col-span-2 lg:col-span-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const name = prompt('Nombre de la categoría (ej: languages, backend_db)')
                                if (name?.trim()) {
                                    const next = { ...skills, [name.trim()]: [] }
                                    updateContent((c) => ({ ...c, skills_adapted: next }))
                                }
                            }}
                        >
                            <Plus className="h-4 w-4 mr-1" /> Añadir categoría
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {saved && (
                <Card className="rounded-[20px] bg-card border-border">
                    <CardContent className="pt-6">
                        <p className="text-muted-foreground mb-3">Contenido guardado. Puedes recompilar el PDF.</p>
                        <Button onClick={handleRecompile} disabled={recompiling} className="bg-accent-gradient hover:opacity-90">
                            {recompiling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileOutput className="h-4 w-4 mr-2" />}
                            Recompilar PDF
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
