import type { Job } from '@/types'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { JobInfoSection } from '@/components/JobInfoSection'
import { ExternalLink } from 'lucide-react'

interface JobDetailModalProps {
    job: Job | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onMarkExpired?: (job: Job) => void
}

export function JobDetailModal({ job, open, onOpenChange, onMarkExpired }: JobDetailModalProps) {
    if (!job) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-card border-border backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle>Detalle de la oferta</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                        <JobInfoSection job={job} />
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        asChild
                    >
                        <a href={job.url} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver Oferta
                        </a>
                    </Button>

                    {job.status !== 'EXPIRED' && onMarkExpired && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-muted-foreground hover:text-[var(--status-expired)] hover:border-[var(--status-expired)]/50 hover:bg-[var(--status-expired)]/5 border-dashed"
                            onClick={() => onMarkExpired(job)}
                        >
                            Marcar como vencida
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
