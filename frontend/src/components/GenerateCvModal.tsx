import { useState } from 'react'
import type { Job } from '@/types'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { JobInfoSection } from '@/components/JobInfoSection'
import {
    Bot,
    Download,
    Loader2,
    Sparkles,
    CheckCircle2,
} from 'lucide-react'
import { jobsApi } from '@/services/api'

type ModalState = 'idle' | 'generating' | 'done' | 'error'

interface GenerateCvModalProps {
    job: Job | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function GenerateCvModal({ job, open, onOpenChange }: GenerateCvModalProps) {
    const [state, setState] = useState<ModalState>('idle')
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    if (!job) return null

    const handleGenerate = async () => {
        setState('generating')
        setError(null)
        try {
            const blob = await jobsApi.generateCv(job.id)
            if (pdfUrl) URL.revokeObjectURL(pdfUrl)
            const url = URL.createObjectURL(blob)
            setPdfUrl(url)
            setState('done')
        } catch (err) {
            setError('Error al generar el CV. Intenta de nuevo.')
            setState('error')
        }
    }

    const handleDownload = () => {
        if (!pdfUrl) return
        const safeName = `CV_${job.company.replace(/[^a-zA-Z0-9]/g, '_')}_${job.title.replace(/[^a-zA-Z0-9]/g, '_')}`
        const a = document.createElement('a')
        a.href = pdfUrl
        a.download = `${safeName}.pdf`
        a.click()
    }

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            // Reset state on close
            setState('idle')
            setError(null)
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl)
                setPdfUrl(null)
            }
        }
        onOpenChange(isOpen)
    }

    const isDoneLayout = state === 'done' && pdfUrl

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent
                className={
                    isDoneLayout
                        ? "sm:max-w-[90vw] lg:max-w-6xl max-h-[90vh] flex flex-col bg-card border-border backdrop-blur-xl"
                        : "sm:max-w-[600px] bg-card border-border backdrop-blur-xl"
                }
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Bot className="h-5 w-5 text-primary" />
                        Generar CV con IA
                    </DialogTitle>
                    <DialogDescription>
                        {isDoneLayout
                            ? "CV generado. Revisa la descripción y el PDF; descarga cuando quieras."
                            : "Se generará un CV personalizado para esta oferta usando inteligencia artificial."}
                    </DialogDescription>
                    {isDoneLayout && (
                        <div className="flex items-center gap-2 text-status-generated text-sm font-medium pt-1">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            CV generado exitosamente
                        </div>
                    )}
                </DialogHeader>

                {!isDoneLayout && (
                    <div className="space-y-4">
                        <div className="max-h-[60vh] overflow-y-auto pr-2">
                            <JobInfoSection job={job} />
                        </div>

                        {state === 'idle' && (
                            <Button
                                className="w-full h-12 text-sm font-semibold bg-primary hover:bg-primary/90"
                                onClick={handleGenerate}
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generar CV con IA
                            </Button>
                        )}

                        {state === 'generating' && (
                            <div className="flex flex-col items-center gap-3 py-6">
                                <div className="relative">
                                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                    <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1 animate-pulse" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium">Generando tu CV personalizado...</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Esto puede tomar hasta 30 segundos
                                    </p>
                                </div>
                            </div>
                        )}

                        {state === 'error' && (
                            <div className="space-y-3">
                                <p className="text-sm text-destructive text-center">{error}</p>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleGenerate}
                                >
                                    Reintentar
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {isDoneLayout && pdfUrl && (
                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
                        <div className="flex flex-col min-h-0">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                Descripción
                            </p>
                            <div className="flex-1 min-h-0 overflow-y-auto pr-2 rounded-lg border border-border bg-secondary/30 p-4">
                                <JobInfoSection job={job} />
                            </div>
                        </div>
                        <div className="flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    PDF
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-8"
                                    onClick={handleDownload}
                                >
                                    <Download className="h-3.5 w-3.5 mr-1.5" />
                                    Descargar PDF
                                </Button>
                            </div>
                            <div className="flex-1 min-h-0 rounded-lg border border-border bg-[#1a1525] overflow-auto flex items-start justify-center p-4">
                                <iframe
                                    src={pdfUrl}
                                    className="w-full min-h-[70vh] shrink-0 bg-white rounded shadow-lg aspect-[612/792]"
                                    title="CV generado"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
