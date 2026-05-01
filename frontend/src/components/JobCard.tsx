import type { Job } from "@/types"
import { Button } from "@/components/ui/button"
import { ExternalLink, Wand2, MapPin, Building2 } from "lucide-react"

interface JobCardProps {
    job: Job
    onGenerate?: (job: Job) => void
    onMarkApplied?: (job: Job) => void
    onViewDetail?: (job: Job) => void
    onOpenUrl?: (job: Job) => void
}

const statusColors: Record<string, { bg: string; text: string }> = {
    NEW: { bg: "bg-pink-500/10", text: "text-pink-400" },
    SAVED: { bg: "bg-primary/10", text: "text-primary" },
    GENERATED: { bg: "bg-tertiary/10", text: "text-tertiary" },
    APPLIED: { bg: "bg-orange-400/10", text: "text-orange-400" },
    EXPIRED: { bg: "bg-gray-500/10", text: "text-gray-400" },
    DISCARDED: { bg: "bg-red-500/10", text: "text-red-500" },
}

const sourceLabels: Record<string, string> = {
    PRACTICAS_PE: "Practicas.pe",
    COMPUTRABAJO: "CompuTrabajo",
    MANUAL: "Manual",
}

export function JobCard({ job, onGenerate, onMarkApplied, onViewDetail, onOpenUrl }: JobCardProps) {
    const statusStyle = statusColors[job.status] || statusColors.NEW
    const sourceLabel = sourceLabels[job.source] || job.source

    const getInitials = (name: string) =>
        name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()

    const getDateLabel = () => {
        if (job.created_at) return `Agregado: ${new Date(job.created_at).toLocaleDateString("es-ES", { month: "short", day: "numeric", year: "numeric" })}`
        return ""
    }

    return (
        <div className="bg-[rgba(15,23,42,0.6)] backdrop-blur-xl border border-white/10 rounded-[24px] p-6 glow-card flex flex-col gap-4 group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-glow-card" style={{ boxShadow: "0 4px 20px rgba(168, 85, 247, 0.15)" }}>
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

            <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center border border-white/10 overflow-hidden">
                        <span className="text-xs font-bold text-on-surface">{getInitials(job.company)}</span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-[1rem] leading-[1.3] text-on-surface mb-0.5 line-clamp-1">{job.title}</h3>
                        <div className="flex items-center gap-2 text-[0.85rem] text-outline">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{job.company}</span>
                            <span>•</span>
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="line-clamp-1">{job.location}</span>
                        </div>
                    </div>
                </div>

            <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full font-label-md text-[0.7rem] border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.text.replace("text-", "border-")}/20`}>
                    {job.status}
                </span>
                <span className="px-3 py-1 bg-surface-container-high text-outline rounded-full font-label-md text-[0.7rem] border border-white/5">
                    {sourceLabel}
                </span>
                {job.salary && (
                    <span className="px-3 py-1 bg-surface-container-high text-outline rounded-full font-label-md text-[0.7rem] border border-white/5">
                        {job.salary}
                    </span>
                )}
            </div>

            {job.description && (
                <p className="text-text-secondary text-[0.8rem] leading-[1.5] line-clamp-2">{job.description}</p>
            )}

            <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="font-code text-[0.7rem] text-outline/60">{getDateLabel()}</span>
                <div className="flex items-center gap-1">
                    {job.status === "SAVED" && (
                        <Button size="sm" className="h-8 px-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[0.75rem] font-semibold shadow-[0_0_10px_rgba(168,85,247,0.3)] hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] border-0" onClick={() => onGenerate?.(job)}>
                            <Wand2 className="h-3.5 w-3.5 mr-1" />
                            Generar
                        </Button>
                    )}
                    {job.status !== "SAVED" && job.url && (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-outline hover:text-on-surface hover:bg-surface-container transition-colors" onClick={() => onOpenUrl?.(job)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    {job.status !== "APPLIED" && onMarkApplied && (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-outline hover:text-on-surface hover:bg-surface-container transition-colors" onClick={() => onMarkApplied(job)}>
                            <span className="text-[0.75rem]">Marcar como postulado</span>
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-outline hover:text-on-surface hover:bg-surface-container transition-colors" onClick={() => onViewDetail?.(job)}>
                        Ver Detalle
                    </Button>
                </div>
            </div>
        </div>
    )
}