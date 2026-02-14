import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { LatexEditor } from '@/components/LatexEditor'
import { PdfPreview } from '@/components/PdfPreview'
import { Button } from '@/components/ui/button'
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui/resizable'
import { Save, FileCode, RotateCcw, Loader2 } from 'lucide-react'
import { useTemplate, useSaveTemplate } from '@/hooks/useTemplate'
import { jobsApi } from '@/services/api'



export default function Templates() {
    const { data: templateData, isLoading, isError } = useTemplate()
    const saveMutation = useSaveTemplate()
    const [content, setContent] = useState('')
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [isCompiling, setIsCompiling] = useState(false)

    const templateContent = templateData?.content
    const templateId = templateData?.id

    // Update local state when data is fetched
    useEffect(() => {
        if (templateContent !== undefined) {
            setContent(templateContent)
        }
    }, [templateContent])

    const handleSave = () => {
        if (templateId) {
            saveMutation.mutate({ content, templateId })
        }
    }

    const handleReset = () => {
        if (templateContent !== undefined) {
            setContent(templateContent)
        }
    }

    const handleCompile = async (newContent?: string) => {
        const source = newContent || content
        setIsCompiling(true)
        try {
            const blob = await jobsApi.compileTemplate(source)
            if (pdfUrl) URL.revokeObjectURL(pdfUrl)
            const url = URL.createObjectURL(blob)
            setPdfUrl(url)
        } catch (error) {
            console.error('Failed to compile', error)
            const message = error instanceof Error ? error.message : 'Error al compilar'
            toast.error(message)
        } finally {
            setIsCompiling(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-64px)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="flex h-[calc(100vh-64px)] items-center justify-center text-destructive">
                Error al cargar el template.
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-background border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <FileCode className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Editor de Template Maestro</h1>
                        <p className="text-sm text-muted-foreground">
                            Define la estructura base para todos los CVs generados. Usa variables Jinja: <code className="text-xs bg-muted px-1 rounded">profile</code> (perfil), <code className="text-xs bg-muted px-1 rounded">adapted</code> (adaptado por IA). Compilar usa los datos del perfil guardado.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={saveMutation.isPending || content === templateContent || !templateContent}
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Revertir Cambios
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saveMutation.isPending || !templateId}
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Guardar Template
                    </Button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel defaultSize={50} minSize={30} className="bg-secondary/20 p-4">
                        <LatexEditor
                            value={content}
                            onChange={setContent}
                            filename="Master_CV.tex"
                            onSave={handleSave}
                            onCompile={() => handleCompile(content)}
                            isCompiling={isCompiling}
                        />
                    </ResizablePanel>

                    <ResizableHandle />

                    <ResizablePanel defaultSize={50} minSize={30} className="bg-background/50 p-4">
                        <PdfPreview
                            pdfUrl={pdfUrl}
                            onDownload={() => { }} // TODO: Add download if needed
                        />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    )
}
