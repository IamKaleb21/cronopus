import { useState, useCallback, useMemo } from 'react'
import type { CvHistoryItem } from '@/types'
import { CvHistoryListItem } from '@/components/CvHistoryListItem'
import { RecompileResultModal } from '@/components/RecompileResultModal'
import { useCvs, useRecompileCv, type CvFilters } from '@/hooks/useCvs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Loader2, AlertCircle, FileStack } from 'lucide-react'

export default function History() {
    const [companyInput, setCompanyInput] = useState('')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [resultModalOpen, setResultModalOpen] = useState(false)
    const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null)
    const [resultItem, setResultItem] = useState<CvHistoryItem | null>(null)
    const [recompilingId, setRecompilingId] = useState<string | null>(null)

    const filters: CvFilters = useMemo(
        () => ({
            company: companyInput.trim() || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
        }),
        [companyInput, fromDate, toDate]
    )
    const { data: cvs = [], isLoading, isError } = useCvs(filters)
    const recompileMutation = useRecompileCv()

    const handleRecompile = useCallback(
        async (item: CvHistoryItem) => {
            setRecompilingId(item.id)
            try {
                const blob = await recompileMutation.mutateAsync(item.id)
                if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl)
                const url = URL.createObjectURL(blob)
                setResultPdfUrl(url)
                setResultItem(item)
                setResultModalOpen(true)
            } catch {
                // Error could be shown with toast
            } finally {
                setRecompilingId(null)
            }
        },
        [recompileMutation, resultPdfUrl]
    )

    const handleResultModalClose = (open: boolean) => {
        if (!open) {
            if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl)
            setResultPdfUrl(null)
            setResultItem(null)
        }
        setResultModalOpen(open)
    }

    return (
        <div className="space-y-8 p-2">
            <div>
                <h1 className="text-3xl font-extrabold text-gradient w-fit">Historial</h1>
                <p className="text-muted-foreground mt-1">CVs generados anteriormente.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="flex-1 min-w-[200px] space-y-2">
                    <Label htmlFor="filter-company">Empresa</Label>
                    <Input
                        id="filter-company"
                        placeholder="Filtrar por empresa"
                        aria-label="Empresa"
                        value={companyInput}
                        onChange={e => setCompanyInput(e.target.value)}
                        className="bg-secondary border-border"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="filter-from">Desde</Label>
                    <Input
                        id="filter-from"
                        type="date"
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        className="bg-secondary border-border w-[160px]"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="filter-to">Hasta</Label>
                    <Input
                        id="filter-to"
                        type="date"
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                        className="bg-secondary border-border w-[160px]"
                    />
                </div>
            </div>

            {isLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="h-12 w-12 mb-4 animate-spin opacity-50" />
                    <p>Cargando historial...</p>
                </div>
            )}

            {!isLoading && isError && (
                <div className="flex flex-col items-center justify-center py-16 text-destructive border border-dashed border-destructive/20 rounded-2xl bg-destructive/5">
                    <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                    <p>Error al cargar el historial. Intenta de nuevo.</p>
                </div>
            )}

            {!isLoading && !isError && cvs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl bg-card">
                    <FileStack className="h-12 w-12 mb-4 opacity-50" />
                    <p>Aún no hay CVs generados.</p>
                </div>
            )}

            {!isLoading && !isError && cvs.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-semibold py-4">Título del Trabajo</TableHead>
                                <TableHead className="font-semibold py-4">Empresa</TableHead>
                                <TableHead className="font-semibold py-4">Fuente</TableHead>
                                <TableHead className="font-semibold py-4">Fecha de Creación</TableHead>
                                <TableHead className="text-right font-semibold py-4">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cvs.map(item => (
                                <CvHistoryListItem
                                    key={item.id}
                                    item={item}
                                    onRecompile={handleRecompile}
                                    isRecompiling={recompilingId === item.id}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <RecompileResultModal
                open={resultModalOpen}
                onOpenChange={handleResultModalClose}
                pdfUrl={resultPdfUrl}
                cvItem={resultItem}
            />
        </div>
    )
}
