import { useState } from 'react'
import { toast } from 'sonner'
import { LatexEditor, DEFAULT_LATEX } from '@/components/LatexEditor'
import { PdfPreview } from '@/components/PdfPreview'
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui/resizable'
import { jobsApi } from '@/services/api'

export default function EditorPage() {
    const [latexContent, setLatexContent] = useState(DEFAULT_LATEX)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [isCompiling, setIsCompiling] = useState(false)

    const handleCompile = async () => {
        setIsCompiling(true)
        try {
            const blob = await jobsApi.compileLatex(latexContent)
            // Revoke old URL to prevent memory leak
            if (pdfUrl) URL.revokeObjectURL(pdfUrl)
            const url = URL.createObjectURL(blob)
            setPdfUrl(url)
        } catch (error) {
            console.error('Compilation failed:', error)
            const message = error instanceof Error ? error.message : 'Error al compilar'
            toast.error(message)
        } finally {
            setIsCompiling(false)
        }
    }

    const handleSave = () => {
        console.log('Saving LaTeX content...')
        // TODO: Save to backend
    }

    const handleDownload = () => {
        if (!pdfUrl) return
        const a = document.createElement('a')
        a.href = pdfUrl
        a.download = 'CV_Generated.pdf'
        a.click()
    }

    return (
        <div className="h-[calc(100vh-64px)] w-full">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={50} minSize={30}>
                    <LatexEditor
                        value={latexContent}
                        onChange={setLatexContent}
                        onSave={handleSave}
                        onCompile={handleCompile}
                        isCompiling={isCompiling}
                    />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={50} minSize={25}>
                    <PdfPreview
                        pdfUrl={pdfUrl}
                        onDownload={handleDownload}
                    />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
