import { useState } from "react"
import type { Job } from "@/types"
import { JobCard } from "@/components/JobCard"
import { AddJobModal } from "@/components/AddJobModal"
import { GenerateCvModal } from "@/components/GenerateCvModal"
import { JobDetailModal } from "@/components/JobDetailModal"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Bookmark, FileCheck, Send, Loader2, AlertCircle, Plus } from "lucide-react"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { useJobs, useUpdateJobStatus } from "@/hooks/useJobs"
import { useJobFilters } from "@/hooks/useJobFilters"
import { getDepartmentFromLocation } from "@/lib/departmentFromLocation"
import type { JobStatus } from "@/types"

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: "ALL", label: "Todas" },
    { value: "NEW", label: "Nuevas" },
    { value: "SAVED", label: "Guardadas" },
    { value: "GENERATED", label: "Generadas" },
    { value: "APPLIED", label: "Aplicadas" },
    { value: "EXPIRED", label: "Vencidas" },
    { value: "DISCARDED", label: "Descartadas" },
]

const SOURCE_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "Todas las fuentes" },
    { value: "PRACTICAS_PE", label: "Practicas.pe" },
    { value: "COMPUTRABAJO", label: "CompuTrabajo" },
    { value: "MANUAL", label: "Manual" },
]

const DEPARTMENT_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "Todas" },
    { value: "Lima", label: "Lima" },
    { value: "Trujillo", label: "Trujillo" },
    { value: "Remoto", label: "Remoto" },
    { value: "Otros", label: "Otros" },
]

interface DashboardProps {
    initialJobs?: Job[]
    itemsPerPage?: number
}

export default function Dashboard({ initialJobs, itemsPerPage = 8 }: DashboardProps) {
    // Dual mode: if initialJobs provided (tests), use local state; otherwise fetch from API
    const isLocalMode = initialJobs !== undefined
    const { data: apiJobs, isLoading, isError } = useJobs(!isLocalMode)
    const updateStatusMutation = useUpdateJobStatus()

    const [localJobs, setLocalJobs] = useState<Job[]>(initialJobs ?? [])
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedJob, setSelectedJob] = useState<Job | null>(null)
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
    const [selectedJobForDetail, setSelectedJobForDetail] = useState<Job | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false)

    const { status, source, location, setStatus, setSource, setLocation } = useJobFilters()

    // Use local or API data
    const jobs = isLocalMode ? localJobs : (apiJobs ?? [])

    const locationCount = (loc: string | null) =>
        loc === null || loc === "all"
            ? jobs.length
            : jobs.filter((j) => getDepartmentFromLocation(j.location) === loc).length
    const locationOptions = DEPARTMENT_OPTIONS.filter(
        (opt) => opt.value === "all" || locationCount(opt.value) > 0
    )

    // Loading state (API mode only)
    if (!isLocalMode && isLoading) {
        return (
            <div className="space-y-8 p-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gradient w-fit">Dashboard</h1>
                        <p className="text-muted-foreground mt-1">Resumen de tu actividad reciente de búsqueda.</p>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="h-12 w-12 mb-4 animate-spin opacity-50" />
                    <p>Cargando ofertas...</p>
                </div>
            </div>
        )
    }

    // Error state (API mode only)
    if (!isLocalMode && isError) {
        return (
            <div className="space-y-8 p-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gradient w-fit">Dashboard</h1>
                        <p className="text-muted-foreground mt-1">Resumen de tu actividad reciente de búsqueda.</p>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center py-16 text-destructive border border-dashed border-destructive/20 rounded-2xl bg-destructive/5">
                    <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                    <p>Error al cargar las ofertas. Intenta de nuevo.</p>
                </div>
            </div>
        )
    }

    // Calculate Stats
    const stats = {
        new: jobs.filter(j => j.status === 'NEW').length,
        saved: jobs.filter(j => j.status === 'SAVED').length,
        generated: jobs.filter(j => j.status === 'GENERATED').length,
        applied: jobs.filter(j => j.status === 'APPLIED').length,
    }

    // Filter & Pagination Logic (status + source combined)
    const filteredJobs = jobs.filter(
        (j) =>
            (status === null || j.status === status) &&
            (source === null || j.source === source) &&
            (location === null || getDepartmentFromLocation(j.location) === location)
    )
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage)

    // Build pagination items: at most 7 page numbers + ellipsis so it doesn't overflow
    const maxVisiblePages = 7
    const paginationItems: (number | "ellipsis")[] = (() => {
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
    })()

    const handleGenerate = (job: Job) => {
        setSelectedJob(job)
        setIsGenerateModalOpen(true)
    }

    const handleViewDetail = (job: Job) => {
        setSelectedJobForDetail(job)
        setIsDetailModalOpen(true)
    }

    const handleMarkApplied = (job: Job) => {
        if (isLocalMode) {
            // Local mode: optimistic update on local state
            setLocalJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'APPLIED' } : j))
        } else {
            // API mode: call mutation
            updateStatusMutation.mutate({ jobId: job.id, status: 'APPLIED' })
        }
    }

    const handleMarkExpired = (job: Job) => {
        if (isLocalMode) {
            setLocalJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'EXPIRED' } : j))
        } else {
            updateStatusMutation.mutate({ jobId: job.id, status: 'EXPIRED' })
        }
    }

    return (
        <>
            <div className="space-y-8 p-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gradient w-fit">Dashboard</h1>
                        <p className="text-muted-foreground mt-1">Resumen de tu actividad reciente de búsqueda.</p>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <Card className="rounded-[20px] bg-card backdrop-blur-md border-border transition-all duration-300 hover:-translate-y-1 hover:bg-card-hover hover:shadow-glow-card group cursor-pointer">
                        <CardHeader className="flex flex-row items-center gap-5 space-y-0 p-6">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(244,114,182,0.18)] text-status-new transition-transform duration-300 group-hover:scale-110">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nuevas Ofertas</CardTitle>
                                <div className="text-3xl font-extrabold text-foreground leading-none mt-2">{stats.new}</div>
                            </div>
                        </CardHeader>
                    </Card>
                    <Card className="rounded-[20px] bg-card backdrop-blur-md border-border transition-all duration-300 hover:-translate-y-1 hover:bg-card-hover hover:shadow-glow-card group cursor-pointer">
                        <CardHeader className="flex flex-row items-center gap-5 space-y-0 p-6">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(139,92,246,0.18)] text-primary transition-transform duration-300 group-hover:scale-110">
                                <Bookmark className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Guardadas</CardTitle>
                                <div className="text-3xl font-extrabold text-foreground leading-none mt-2">{stats.saved}</div>
                            </div>
                        </CardHeader>
                    </Card>
                    <Card className="rounded-[20px] bg-card backdrop-blur-md border-border transition-all duration-300 hover:-translate-y-1 hover:bg-card-hover hover:shadow-glow-card group cursor-pointer">
                        <CardHeader className="flex flex-row items-center gap-5 space-y-0 p-6">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(110,231,183,0.18)] text-status-generated transition-transform duration-300 group-hover:scale-110">
                                <FileCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">CVs Generados</CardTitle>
                                <div className="text-3xl font-extrabold text-foreground leading-none mt-2">{stats.generated}</div>
                            </div>
                        </CardHeader>
                    </Card>
                    <Card className="rounded-[20px] bg-card backdrop-blur-md border-border transition-all duration-300 hover:-translate-y-1 hover:bg-card-hover hover:shadow-glow-card group cursor-pointer">
                        <CardHeader className="flex flex-row items-center gap-5 space-y-0 p-6">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(253,186,116,0.18)] text-status-applied transition-transform duration-300 group-hover:scale-110">
                                <Send className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Postulaciones</CardTitle>
                                <div className="text-3xl font-extrabold text-foreground leading-none mt-2">{stats.applied}</div>
                            </div>
                        </CardHeader>
                    </Card>
                </div>

                {/* Filter & Grid */}
                <div className="w-full">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            Ofertas Recientes <span className="text-muted-foreground font-normal text-sm">({filteredJobs.length})</span>
                        </h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-border bg-secondary/50 hover:bg-secondary"
                                onClick={() => setIsAddJobModalOpen(true)}
                            >
                                <Plus className="h-4 w-4 mr-1.5" />
                                Agregar trabajo
                            </Button>
                            <Select
                                value={status ?? "ALL"}
                                onValueChange={(v) => {
                                    setStatus(v === "ALL" ? null : (v as JobStatus))
                                    setCurrentPage(1)
                                }}
                            >
                                <SelectTrigger className="w-[140px] bg-secondary/50 border-border h-9" aria-label="Estado">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={location ?? "all"}
                                onValueChange={(v) => {
                                    setLocation(v === "all" ? null : v)
                                    setCurrentPage(1)
                                }}
                            >
                                <SelectTrigger className="w-[130px] bg-secondary/50 border-border h-9" aria-label="Ubicación">
                                    <SelectValue placeholder="Ubicación" />
                                </SelectTrigger>
                                <SelectContent>
                                    {locationOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={source ?? "all"}
                                onValueChange={(v) => {
                                    setSource(v === "all" ? null : (v as "PRACTICAS_PE" | "COMPUTRABAJO" | "MANUAL"))
                                    setCurrentPage(1)
                                }}
                            >
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
                    </div>

                    <div className="mt-0 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {paginatedJobs.map(job => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    onGenerate={handleGenerate}
                                    onMarkApplied={handleMarkApplied}
                                    onViewDetail={handleViewDetail}
                                />
                            ))}
                        </div>

                        {paginatedJobs.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-white/10 rounded-2xl bg-card/30">
                                <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                                <p>No hay ofertas en esta categoría.</p>
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-6">
                                <Pagination>
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
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AddJobModal
                open={isAddJobModalOpen}
                onOpenChange={setIsAddJobModalOpen}
                onSuccess={() => setStatus('SAVED')}
            />
            <GenerateCvModal
                job={selectedJob}
                open={isGenerateModalOpen}
                onOpenChange={setIsGenerateModalOpen}
            />
            <JobDetailModal
                job={selectedJobForDetail}
                open={isDetailModalOpen}
                onOpenChange={setIsDetailModalOpen}
                onMarkExpired={handleMarkExpired}
            />
        </>
    )
}
