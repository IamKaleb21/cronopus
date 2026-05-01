import { useState, useCallback, useMemo, useEffect } from 'react'
import type { CvHistoryItem } from '@/types'
import { CvHistoryListItem } from '@/components/CvHistoryListItem'
import { RecompileResultModal } from '@/components/RecompileResultModal'
import { useCvs, useRecompileCv, type CvFilters } from '@/hooks/useCvs'
import { Loader2, AlertCircle, Search, FileStack, Calendar, FileText } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/page-header'

export default function History() {
    const [searchInput, setSearchInput] = useState('')
    const [timeFilter, setTimeFilter] = useState('all')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [resultModalOpen, setResultModalOpen] = useState(false)
    const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null)
    const [resultItem, setResultItem] = useState<CvHistoryItem | null>(null)
    const [recompilingId, setRecompilingId] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 9

    const filters: CvFilters = useMemo(
        () => ({
            company: searchInput.trim() || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
        }),
        [searchInput, fromDate, toDate]
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

    const filteredCvs = useMemo(() => {
        let result = cvs
        if (timeFilter === '30') {
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            result = result.filter(cv => new Date(cv.created_at) >= thirtyDaysAgo)
        } else if (timeFilter === '90') {
            const ninetyDaysAgo = new Date()
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
            result = result.filter(cv => new Date(cv.created_at) >= ninetyDaysAgo)
        } else if (timeFilter === 'year') {
            const yearAgo = new Date()
            yearAgo.setFullYear(yearAgo.getFullYear() - 1)
            result = result.filter(cv => new Date(cv.created_at) >= yearAgo)
        }
        return result
    }, [cvs, timeFilter])

    const totalPages = Math.ceil(filteredCvs.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedCvs = filteredCvs.slice(startIndex, startIndex + itemsPerPage)

    const maxVisiblePages = 7
    const paginationItems: (number | "ellipsis")[] = useMemo(() => {
        if (totalPages <= maxVisiblePages) {
            return Array.from({ length: totalPages }, (_, i) => i + 1)
        }
        const pages = new Set<number>([1, totalPages])
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
            if (i >= 1 && i <= totalPages) pages.add(i)
        }
        const sorted = [...pages].sort((a, b) => a - b)
        const result: (number | "ellipsis")[] = []
        let prev = 0
        for (const p of sorted) {
            if (prev && p - prev > 1) result.push("ellipsis")
            result.push(p)
            prev = p
        }
        return result
    }, [totalPages, currentPage])

    useEffect(() => {
        setCurrentPage(1)
    }, [timeFilter, searchInput, fromDate, toDate])

    return (
        <div className="space-y-8 p-2">
            <PageHeader
                title="Historial de CVs"
                description="Revisa y recompila tus currículums vitae generados anteriormente."
                icon={<FileText className="h-5 w-5" />}
            />

            <div className="flex flex-col sm:flex-row gap-4 items-center bg-surface-container/50 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline text-[18px]" />
                    <input
                        className="w-full border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 transition-all h-10"
                        placeholder="Empresa..."
                        type="text"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 items-center">
                    <label className="relative">
                        <span className="sr-only">Desde</span>
                        <input
                            className="w-full sm:w-32 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 transition-all h-10"
                            placeholder="Desde"
                            type="date"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                        />
                    </label>
                    <label className="relative">
                        <span className="sr-only">Hasta</span>
                        <input
                            className="w-full sm:w-32 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 transition-all h-10"
                            placeholder="Hasta"
                            type="date"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                        />
                    </label>
                </div>
                <div className="relative w-full sm:w-48">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline pointer-events-none z-10" />
                    <Select value={timeFilter} onValueChange={setTimeFilter}>
                        <SelectTrigger className="w-full pl-9 pr-8 bg-surface-container-low border border-white/10 text-on-surface h-10 rounded-lg text-sm" style={{ background: 'rgba(19, 27, 46, 0.8)' }}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30">Últimos 30 días</SelectItem>
                            <SelectItem value="90">Últimos 90 días</SelectItem>
                            <SelectItem value="year">Este año</SelectItem>
                            <SelectItem value="all">Todo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
                    <Loader2 className="h-12 w-12 mb-4 animate-spin opacity-50" />
                    <p>Cargando historial...</p>
                </div>
            )}

            {!isLoading && isError && (
                <div className="flex flex-col items-center justify-center py-16 text-error border border-dashed border-error/20 rounded-2xl bg-error-container/10">
                    <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                    <p>Error al cargar el historial. Intenta de nuevo.</p>
                </div>
            )}

            {!isLoading && !isError && filteredCvs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant border border-dashed border-white/10 rounded-2xl bg-surface-container/30">
                    <FileStack className="h-12 w-12 mb-4 opacity-50" />
                    <p>No hay CVs generados.</p>
                </div>
            )}

            {!isLoading && !isError && filteredCvs.length > 0 && (
                <div className="bg-[rgba(15,23,42,0.6)] backdrop-blur-xl border border-white/10 rounded-[24px] glow-card overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-surface-container-low/50">
                                    <th className="py-4 px-6 text-[0.7rem] uppercase font-semibold tracking-wider text-on-surface-variant">Puesto</th>
                                    <th className="py-4 px-6 text-[0.7rem] uppercase font-semibold tracking-wider text-on-surface-variant">Empresa</th>
                                    <th className="py-4 px-6 text-[0.7rem] uppercase font-semibold tracking-wider text-on-surface-variant">Fuente</th>
                                    <th className="py-4 px-6 text-[0.7rem] uppercase font-semibold tracking-wider text-on-surface-variant">Fecha</th>
                                    <th className="py-4 px-6 text-[0.7rem] uppercase font-semibold tracking-wider text-on-surface-variant text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="text-[0.85rem] text-slate-300">
                                {paginatedCvs.map(item => (
                                    <CvHistoryListItem
                                        key={item.id}
                                        item={item}
                                        onRecompile={handleRecompile}
                                        isRecompiling={recompilingId === item.id}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-white/10 flex items-center justify-between bg-surface-container-low/30">
                        <span className="text-sm text-slate-400">
                            Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredCvs.length)} de {filteredCvs.length} resultados
                        </span>
                        {totalPages > 1 && (
                            <Pagination className="justify-end">
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                if (currentPage > 1) setCurrentPage(p => p - 1)
                                            }}
                                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                    {paginationItems.map((item, idx) =>
                                        item === "ellipsis" ? (
                                            <PaginationItem key={`ellipsis-${idx}`}>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        ) : (
                                            <PaginationItem key={item}>
                                                <PaginationLink
                                                    href="#"
                                                    isActive={currentPage === item}
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        setCurrentPage(item)
                                                    }}
                                                >
                                                    {item}
                                                </PaginationLink>
                                            </PaginationItem>
                                        )
                                    )}
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                if (currentPage < totalPages) setCurrentPage(p => p + 1)
                                            }}
                                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        )}
                    </div>
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