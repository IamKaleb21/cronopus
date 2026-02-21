import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CvHistoryItem } from '@/types'
import { CvHistoryCard } from '@/components/CvHistoryCard'
import { RecompileResultModal } from '@/components/RecompileResultModal'
import { useCvs, useRecompileCv } from '@/hooks/useCvs'
import { getDepartmentFromLocation } from '@/lib/departmentFromLocation'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertCircle, FileStack } from 'lucide-react'

const SOURCE_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'Todas las fuentes' },
    { value: 'PRACTICAS_PE', label: 'Practicas.pe' },
    { value: 'COMPUTRABAJO', label: 'CompuTrabajo' },
    { value: 'MANUAL', label: 'Manual' },
]

const DEPARTMENT_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'Lima', label: 'Lima' },
    { value: 'Trujillo', label: 'Trujillo' },
    { value: 'Remoto', label: 'Remoto' },
    { value: 'Otros', label: 'Otros' },
]

export default function GeneratedCvs() {
    const navigate = useNavigate()
    const [locationFilter, setLocationFilter] = useState<string>('all')
    const [sourceFilter, setSourceFilter] = useState<string>('all')
    const [resultModalOpen, setResultModalOpen] = useState(false)
    const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null)
    const [resultItem, setResultItem] = useState<CvHistoryItem | null>(null)
    const [recompilingId, setRecompilingId] = useState<string | null>(null)

    const { data: cvs = [], isLoading, isError } = useCvs()
    const recompileMutation = useRecompileCv()

    const filteredCvs = useMemo(() => {
        return cvs.filter((item) => {
            const dept = getDepartmentFromLocation(item.location ?? '')
            const locationMatch = locationFilter === 'all' || dept === locationFilter
            const sourceMatch = sourceFilter === 'all' || item.source === sourceFilter
            return locationMatch && sourceMatch
        })
    }, [cvs, locationFilter, sourceFilter])

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

    const handleEdit = useCallback(
        (item: CvHistoryItem) => {
            navigate(`/generated-cvs/${item.id}/edit`)
        },
        [navigate]
    )

    const handleResultModalClose = (open: boolean) => {
        if (!open) {
            if (resultPdfUrl) URL.revokeObjectURL(resultPdfUrl)
            setResultPdfUrl(null)
            setResultItem(null)
        }
        setResultModalOpen(open)
    }

    if (isLoading) {
        return (
            <div className="space-y-8 p-2">
                <h1 className="text-3xl font-extrabold text-gradient w-fit">CVs Generados</h1>
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="h-12 w-12 mb-4 animate-spin opacity-50" />
                    <p>Cargando CVs...</p>
                </div>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="space-y-8 p-2">
                <h1 className="text-3xl font-extrabold text-gradient w-fit">CVs Generados</h1>
                <div className="flex flex-col items-center justify-center py-16 text-destructive border border-dashed border-destructive/20 rounded-2xl bg-destructive/5">
                    <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-center px-4">Error al cargar los CVs.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 p-2 pb-24">
            <div>
                <h1 className="text-3xl font-extrabold text-gradient w-fit">CVs Generados</h1>
                <p className="text-muted-foreground mt-1">CVs generados por oferta. Edita el contenido adaptado o recompila el PDF.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="w-[130px] bg-secondary/50 border-border h-9" aria-label="Ubicación">
                        <SelectValue placeholder="Ubicación" />
                    </SelectTrigger>
                    <SelectContent>
                        {DEPARTMENT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-[160px] bg-secondary/50 border-border h-9" aria-label="Fuente">
                        <SelectValue placeholder="Fuente" />
                    </SelectTrigger>
                    <SelectContent>
                        {SOURCE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {filteredCvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-white/10 rounded-2xl bg-card/30">
                    <FileStack className="h-12 w-12 mb-4 opacity-20" />
                    <p>No hay CVs generados con estos filtros.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCvs.map((item) => (
                        <CvHistoryCard
                            key={item.id}
                            item={item}
                            onRecompile={handleRecompile}
                            isRecompiling={recompilingId === item.id}
                            onEdit={handleEdit}
                        />
                    ))}
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
