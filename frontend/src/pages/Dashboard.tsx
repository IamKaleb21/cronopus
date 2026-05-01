import { useState } from "react"
import type { Job } from "@/types"
import { JobCard } from "@/components/JobCard"
import { AddJobModal } from "@/components/AddJobModal"
import { GenerateCvModal } from "@/components/GenerateCvModal"
import { JobDetailModal } from "@/components/JobDetailModal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Sparkles, Bookmark, FileCheck, Send, Loader2, AlertCircle, Plus, LayoutDashboard } from "lucide-react"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { useJobs, useUpdateJobStatus } from "@/hooks/useJobs"
import { useJobFilters } from "@/hooks/useJobFilters"
import { getDepartmentFromLocation } from "@/lib/departmentFromLocation"
import type { JobStatus } from "@/types"

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: "ALL", label: "Todas" },
    { value: "NEW", label: "Nuevas" },
    { value: "SAVED", label: "Guardadas" },
    { value: "GENERATED", label: "Generadas" },
    { value: "APPLIED", label: "Postuladas" },
    { value: "EXPIRED", label: "Vencidas" },
    { value: "DISCARDED", label: "Descartadas" },
]

const SOURCE_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "Todas" },
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

export default function Dashboard({ initialJobs, itemsPerPage = 6 }: DashboardProps) {
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
    const [searchQuery, setSearchQuery] = useState("")

    const { status, source, location, setStatus, setSource, setLocation } = useJobFilters()

    const jobs = isLocalMode ? localJobs : (apiJobs ?? [])

    const locationCount = (loc: string | null) =>
        loc === null || loc === "all"
            ? jobs.length
            : jobs.filter((j) => getDepartmentFromLocation(j.location) === loc).length
    const locationOptions = DEPARTMENT_OPTIONS.filter(
        (opt) => opt.value === "all" || locationCount(opt.value) > 0
    )

    if (!isLocalMode && isLoading) {
        return (
            <div className="space-y-8 p-2">
                <PageHeader
                    title="Panel de control"
                    description="Gestiona tus ofertas de trabajo y postulaciones."
                    icon={<LayoutDashboard className="h-5 w-5" />}
                />
                <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
                    <Loader2 className="h-12 w-12 mb-4 animate-spin opacity-50" />
                    <p>Cargando ofertas...</p>
                </div>
            </div>
        )
    }

    if (!isLocalMode && isError) {
        return (
            <div className="space-y-8 p-2">
                <PageHeader
                    title="Panel de control"
                    description="Gestiona tus ofertas de trabajo y postulaciones."
                    icon={<LayoutDashboard className="h-5 w-5" />}
                />
                <div className="flex flex-col items-center justify-center py-16 text-error border border-error/20 rounded-2xl bg-error-container/10">
                    <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                    <p>Error al cargar las ofertas. Intenta de nuevo.</p>
                </div>
            </div>
        )
    }

    const stats = {
        new: jobs.filter(j => j.status === 'NEW').length,
        saved: jobs.filter(j => j.status === 'SAVED').length,
        generated: jobs.filter(j => j.status === 'GENERATED').length,
        applied: jobs.filter(j => j.status === 'APPLIED').length,
    }

    const filteredJobs = jobs.filter(
        (j) =>
            (status === null || j.status === status) &&
            (source === null || j.source === source) &&
            (location === null || getDepartmentFromLocation(j.location) === location) &&
            (searchQuery === "" ||
                j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                j.company?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage)

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
            setLocalJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'APPLIED' } : j))
        } else {
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
            <div className="space-y-10 p-2">
                <PageHeader
                    title="Panel de control"
                    description="Gestiona tus ofertas de trabajo y postulaciones."
                    icon={<LayoutDashboard className="h-5 w-5" />}
                    actions={
                        <Button
                            className="bg-gradient-to-r from-primary-container to-secondary text-white text-sm font-medium shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-all"
                            onClick={() => setIsAddJobModalOpen(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Agregar trabajo
                        </Button>
                    }
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="glow-card relative overflow-hidden group" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '24px' }}>
                        <div className="absolute inset-0" style={{ background: 'rgba(255, 175, 211, 0.1)' }} />
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-2 rounded-lg" style={{ background: 'rgba(255, 175, 211, 0.1)', color: '#ffafd3' }}>
                                <Sparkles className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-3xl font-bold mb-1" style={{ color: '#dae2fd' }}>{stats.new}</p>
                            <p className="text-sm" style={{ color: '#988d9f' }}>Ofertas nuevas</p>
                        </div>
                    </div>

                    <div className="glow-card relative overflow-hidden group" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '24px' }}>
                        <div className="absolute inset-0" style={{ background: 'rgba(221, 183, 255, 0.1)' }} />
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-2 rounded-lg" style={{ background: 'rgba(221, 183, 255, 0.1)', color: '#ddb7ff' }}>
                                <Bookmark className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-3xl font-bold mb-1" style={{ color: '#dae2fd' }}>{stats.saved}</p>
                            <p className="text-sm" style={{ color: '#988d9f' }}>Ofertas guardadas</p>
                        </div>
                    </div>

                    <div className="glow-card relative overflow-hidden group" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '24px' }}>
                        <div className="absolute inset-0" style={{ background: 'rgba(98, 220, 173, 0.1)' }} />
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-2 rounded-lg" style={{ background: 'rgba(98, 220, 173, 0.1)', color: '#62dcad' }}>
                                <FileCheck className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-3xl font-bold mb-1" style={{ color: '#dae2fd' }}>{stats.generated}</p>
                            <p className="text-sm" style={{ color: '#988d9f' }}>CVs generados</p>
                        </div>
                    </div>

                    <div className="glow-card relative overflow-hidden group" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '24px' }}>
                        <div className="absolute inset-0" style={{ background: 'rgba(251, 146, 60, 0.1)' }} />
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-2 rounded-lg" style={{ background: 'rgba(251, 146, 60, 0.1)', color: '#fb923c' }}>
                                <Send className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-3xl font-bold mb-1" style={{ color: '#dae2fd' }}>{stats.applied}</p>
                            <p className="text-sm" style={{ color: '#988d9f' }}>Postulaciones enviadas</p>
                        </div>
                    </div>
                </div>

                <div style={{ background: 'rgba(23, 31, 51, 0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '16px' }} className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#988d9f' }} />
                        <input
                            className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm transition-colors"
                            style={{ background: 'rgba(19, 27, 46, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#dae2fd', outline: 'none' }}
                            placeholder="Buscar roles, empresas..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setCurrentPage(1)
                            }}
                        />
                    </div>
                    <div className="flex gap-4 items-center">
                        <label className="text-sm font-medium" style={{ color: '#988d9f' }}>Estado:</label>
                        <Select
                            value={status ?? "ALL"}
                            onValueChange={(v) => {
                                setStatus(v === "ALL" ? null : (v as JobStatus))
                                setCurrentPage(1)
                            }}
                        >
                            <SelectTrigger aria-label="Estado" className="rounded-lg px-3 py-2 text-sm min-w-[120px]" style={{ background: 'rgba(19, 27, 46, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#dae2fd' }}>
                                <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <label className="text-sm font-medium" style={{ color: '#988d9f' }}>Ubicación:</label>
                        <Select
                            value={location ?? "all"}
                            onValueChange={(v) => {
                                setLocation(v === "all" ? null : v)
                                setCurrentPage(1)
                            }}
                        >
                            <SelectTrigger aria-label="Ubicación" className="rounded-lg px-3 py-2 text-sm min-w-[120px]" style={{ background: 'rgba(19, 27, 46, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#dae2fd' }}>
                                <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                                {locationOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <label className="text-sm font-medium" style={{ color: '#988d9f' }}>Fuente:</label>
                        <Select
                            value={source ?? "all"}
                            onValueChange={(v) => {
                                setSource(v === "all" ? null : (v as "PRACTICAS_PE" | "COMPUTRABAJO" | "MANUAL"))
                                setCurrentPage(1)
                            }}
                        >
                            <SelectTrigger aria-label="Fuente" className="rounded-lg px-3 py-2 text-sm min-w-[120px]" style={{ background: 'rgba(19, 27, 46, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#dae2fd' }}>
                                <SelectValue placeholder="Todas" />
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

                <div className="mt-0">
                    <h2 className="text-lg font-semibold text-on-surface mb-6">
                        Ofertas Recientes <span className="text-sm font-normal text-outline">({filteredJobs.length})</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                        <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant border border-dashed border-white/10 rounded-2xl bg-surface-container/30">
                            <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                            <p>No hay ofertas en esta categoría.</p>
                        </div>
                    )}

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
