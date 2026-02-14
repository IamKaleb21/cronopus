import type { CvHistoryItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Calendar, FileOutput, Loader2 } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'

interface CvHistoryListItemProps {
    item: CvHistoryItem
    onRecompile: (item: CvHistoryItem) => void
    isRecompiling?: boolean
}

function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-PE', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    })
}

function getSourceBadge(source: CvHistoryItem['source']) {
    const sourceLabels: Record<CvHistoryItem['source'], string> = {
        PRACTICAS_PE: 'Practicas.pe',
        COMPUTRABAJO: 'CompuTrabajo',
        MANUAL: 'Manual',
    }
    
    const sourceColors: Record<CvHistoryItem['source'], string> = {
        PRACTICAS_PE: 'bg-gradient-to-br from-violet-500 to-indigo-500 text-white',
        COMPUTRABAJO: 'bg-gradient-to-br from-pink-500 to-orange-400 text-white',
        MANUAL: 'bg-gradient-to-br from-slate-500 to-slate-600 text-white',
    }
    
    return (
        <Badge 
            variant="outline" 
            className={`${sourceColors[source]} border-0 px-3 py-1 text-xs font-semibold`}
        >
            {sourceLabels[source]}
        </Badge>
    )
}

export function CvHistoryListItem({ item, onRecompile, isRecompiling }: CvHistoryListItemProps) {
    return (
        <TableRow className="hover:bg-muted/30 transition-colors">
            <TableCell className="font-semibold text-foreground py-4">
                {item.job_title}
            </TableCell>
            <TableCell className="py-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>{item.company}</span>
                </div>
            </TableCell>
            <TableCell className="py-4">
                {getSourceBadge(item.source)}
            </TableCell>
            <TableCell className="py-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span className="text-sm">{formatDate(item.created_at)}</span>
                </div>
            </TableCell>
            <TableCell className="text-right py-4">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRecompile(item)}
                    disabled={isRecompiling}
                    className="min-w-[140px]"
                >
                    {isRecompiling ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Recompilando...
                        </>
                    ) : (
                        <>
                            <FileOutput className="h-4 w-4 mr-2" />
                            Ver / Recompilar
                        </>
                    )}
                </Button>
            </TableCell>
        </TableRow>
    )
}
