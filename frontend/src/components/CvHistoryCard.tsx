import type { CvHistoryItem } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Calendar, FileOutput, Loader2 } from 'lucide-react'

interface CvHistoryCardProps {
    item: CvHistoryItem
    onRecompile: (item: CvHistoryItem) => void
    isRecompiling?: boolean
    onEdit?: (item: CvHistoryItem) => void
}

function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function CvHistoryCard({ item, onRecompile, isRecompiling, onEdit }: CvHistoryCardProps) {
    return (
        <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-glow-card hover:bg-card-hover bg-card border-border backdrop-blur-md rounded-[24px] p-[1.65rem]">
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center justify-center w-[34px] h-[34px] rounded-xl text-[0.75rem] font-bold bg-linear-to-br from-violet-500 to-indigo-500 text-white">
                    CV
                </div>
            </div>
            <div className="mb-4">
                <h3 className="font-semibold text-[1.1rem] leading-[1.3] mb-1.5 text-foreground">
                    {item.job_title}
                </h3>
                <div className="flex items-center gap-2 text-[0.95rem] font-medium text-accent-secondary">
                    <Building2 className="h-4 w-4" />
                    <span>{item.company}</span>
                </div>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[0.85rem] mb-5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(item.created_at)}</span>
            </div>
            <div className="flex flex-col gap-2">
                {onEdit && (
                    <Button
                        variant="outline"
                        className="w-full text-[0.9rem] font-semibold h-auto py-2.5 border-border bg-secondary/50 hover:bg-secondary"
                        onClick={() => onEdit(item)}
                    >
                        Editar
                    </Button>
                )}
                <Button
                    className="w-full text-[0.9rem] font-semibold h-auto py-2.5"
                    onClick={() => onRecompile(item)}
                    disabled={isRecompiling}
                >
                    {isRecompiling ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <FileOutput className="h-4 w-4 mr-2" />
                    )}
                    Ver / Recompilar
                </Button>
            </div>
        </Card>
    )
}
