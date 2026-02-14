import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, Download, FileText } from 'lucide-react'

interface PdfPreviewProps {
    pdfUrl?: string | null
    onDownload?: () => void
}

export function PdfPreview({ pdfUrl, onDownload }: PdfPreviewProps) {
    const [zoom, setZoom] = useState(100)

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))
    const handleZoomReset = () => setZoom(100)

    return (
        <div className="flex flex-col h-full">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/50 border-b border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span>Vista Previa PDF</span>
                </div>
                <div className="flex gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 w-7 p-0 border-border"
                        onClick={handleZoomOut}
                        disabled={zoom <= 50}
                    >
                        <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2 border-border min-w-[48px]"
                        onClick={handleZoomReset}
                    >
                        {zoom}%
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 w-7 p-0 border-border"
                        onClick={handleZoomIn}
                        disabled={zoom >= 200}
                    >
                        <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 border-border ml-2"
                        onClick={onDownload}
                        disabled={!pdfUrl}
                    >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Descargar
                    </Button>
                </div>
            </div>

            {/* PDF Content Area */}
            <div className="flex-1 min-h-0 overflow-auto bg-[#1a1525] flex items-center justify-center p-6">
                {pdfUrl ? (
                    <div
                        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                        className="transition-transform duration-200"
                    >
                        <iframe
                            src={pdfUrl}
                            className="bg-white rounded shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                            style={{ width: '612px', height: '792px' }}
                            title="Vista previa PDF"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <div className="w-24 h-32 bg-card/50 rounded-lg border border-dashed border-border flex items-center justify-center">
                            <FileText className="h-10 w-10 opacity-30" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">Sin vista previa</p>
                            <p className="text-xs mt-1 opacity-70">Compila el LaTeX para ver el PDF aquí</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
