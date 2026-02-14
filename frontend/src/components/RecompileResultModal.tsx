import type { CvHistoryItem } from '@/types'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, CheckCircle2 } from 'lucide-react'

interface RecompileResultModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    pdfUrl: string | null
    cvItem: CvHistoryItem | null
}

export function RecompileResultModal({ open, onOpenChange, pdfUrl, cvItem }: RecompileResultModalProps) {
    const handleDownload = () => {
        if (!pdfUrl || !cvItem) return
        const safeName = `CV_${cvItem.company.replace(/[^a-zA-Z0-9]/g, '_')}_${cvItem.job_title.replace(/[^a-zA-Z0-9]/g, '_')}`
        const a = document.createElement('a')
        a.href = pdfUrl
        a.download = `${safeName}.pdf`
        a.click()
    }

    const handleClose = (isOpen: boolean) => {
        if (!isOpen && pdfUrl) {
            URL.revokeObjectURL(pdfUrl)
        }
        onOpenChange(isOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[90vw] lg:max-w-5xl max-h-[90vh] flex flex-col bg-card border-border backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <CheckCircle2 className="h-5 w-5 text-status-generated" />
                        PDF recompilado
                    </DialogTitle>
                    <DialogDescription>
                        {cvItem && (
                            <>CV para {cvItem.company} – {cvItem.job_title}</>
                        )}
                    </DialogDescription>
                </DialogHeader>
                {pdfUrl && (
                    <div className="flex flex-col flex-1 min-h-0 space-y-3 mt-2">
                        <div className="flex-1 min-h-0 rounded-lg border border-border bg-[#1a1525] overflow-auto flex items-start justify-center p-4">
                            <iframe
                                src={pdfUrl}
                                className="w-full min-h-[70vh] shrink-0 bg-white rounded shadow-lg aspect-[612/792]"
                                title="CV Preview"
                            />
                        </div>
                        <Button
                            className="w-full h-10 text-sm font-semibold shrink-0"
                            onClick={handleDownload}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar PDF
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
