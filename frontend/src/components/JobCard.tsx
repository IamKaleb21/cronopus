import type { Job } from "@/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Building2, Wallet, ExternalLink, Wand2 } from "lucide-react"

interface JobCardProps {
    job: Job
    onGenerate?: (job: Job) => void
    onMarkApplied?: (job: Job) => void
    onViewDetail?: (job: Job) => void
}

const statusColors: Record<string, string> = {
    NEW: "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 border-pink-500/20",
    SAVED: "bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 border-violet-500/20",
    GENERATED: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20",
    APPLIED: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20",
    EXPIRED: "bg-gray-500/10 text-[var(--status-expired)] hover:bg-gray-500/20 border-gray-500/20",
    DISCARDED: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20",
}

export function JobCard({ job, onGenerate, onMarkApplied, onViewDetail }: JobCardProps) {
    return (
        <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-glow-card hover:bg-card-hover bg-card border-border backdrop-blur-md rounded-[24px] p-[1.65rem]">
            {/* Top Gradient Border Effect */}
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

            <div className="flex justify-between items-start mb-4">
                {/* Source Logo */}
                <div className="flex items-center gap-2">
                    <div className={`
                        flex items-center justify-center w-[34px] h-[34px] rounded-xl text-[0.75rem] font-bold transition-transform duration-300 group-hover:scale-110 shadow-sm
                        ${job.source === 'PRACTICAS_PE' ? 'bg-gradient-to-br from-violet-500 to-indigo-500 text-white' : ''}
                        ${job.source === 'COMPUTRABAJO' ? 'bg-gradient-to-br from-pink-500 to-orange-400 text-white' : ''}
                        ${!['PRACTICAS_PE', 'COMPUTRABAJO'].includes(job.source) ? 'bg-secondary text-muted-foreground' : ''}
                    `}>
                        {job.source.substring(0, 2)}
                    </div>
                </div>

                {/* Status Badge */}
                <Badge variant="outline" className={`
                    border-0 px-[0.85rem] py-[0.35rem] rounded-[24px] text-[0.7rem] uppercase font-bold tracking-wider
                    ${statusColors[job.status] || "bg-secondary text-muted-foreground"}
                `}>
                    {job.status}
                </Badge>
            </div>

            <div className="mb-4">
                <h3 className="font-semibold text-[1.1rem] leading-[1.3] mb-1.5 text-foreground">
                    {job.title}
                </h3>
                <div className="flex items-center gap-2 text-[0.95rem] font-medium text-accent-secondary">
                    <Building2 className="h-4 w-4" />
                    <span>{job.company}</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 text-muted-foreground text-[0.85rem] mb-4">
                <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{job.location}</span>
                </div>
                {job.salary && (
                    <div className="flex items-center gap-1.5 text-status-generated">
                        <Wallet className="h-3.5 w-3.5" />
                        <span>{job.salary}</span>
                    </div>
                )}
            </div>

            <p className="text-text-secondary line-clamp-2 text-[0.85rem] leading-[1.6] mb-5">
                {job.description}
            </p>

            {/* Tags if available - simplistic implementation based on description or existing data if we had it */}
            {/* For now skipping tags as they aren't in the base Job interface clearly, or adding static for demo if needed, but aiming for accuracy to interface */}

            <div className="flex flex-col gap-3 mt-auto">
                <div className="flex gap-3">
                    {job.status === 'SAVED' ? (
                        <Button
                            className="flex-1 relative overflow-hidden text-[0.9rem] font-semibold h-auto py-2.5 bg-accent-gradient text-white shadow-[0_4px_15px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(139,92,246,0.4)] hover:shadow-glow-primary active:scale-95 transition-all duration-200 border-none group/btn"
                            onClick={() => onGenerate?.(job)}
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                            <Wand2 className="mr-2 h-4 w-4 relative z-10" />
                            <span className="relative z-10">Generar CV</span>
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            className="flex-1 bg-secondary text-muted-foreground border border-white/10 hover:bg-card-hover hover:text-foreground hover:border-accent/40 active:scale-95 transition-all duration-200 text-[0.8rem] font-semibold h-auto py-2.5"
                            asChild
                        >
                            <a href={job.url} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ver Oferta
                            </a>
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        className="flex-1 bg-secondary text-muted-foreground border border-white/10 hover:bg-card-hover hover:text-foreground hover:border-accent/40 active:scale-95 transition-all duration-200 text-[0.8rem] font-semibold h-auto py-2.5"
                        onClick={() => onViewDetail?.(job)}
                    >
                        Ver Detalle
                    </Button>
                </div>

                {job.status !== 'APPLIED' && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs border-dashed border-white/20 text-muted-foreground hover:text-status-applied hover:border-status-applied/50 hover:bg-status-applied/5"
                        onClick={() => onMarkApplied?.(job)}
                    >
                        Marcar como Postulado
                    </Button>
                )}
            </div>
        </Card>
    )
}
