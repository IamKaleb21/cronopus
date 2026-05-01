import type { CvHistoryItem } from '@/types'
import { FileOutput, Loader2, Pencil } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import { useNavigate } from 'react-router-dom'

interface CvHistoryListItemProps {
    item: CvHistoryItem
    onRecompile: (item: CvHistoryItem) => void
    isRecompiling?: boolean
}

const sourceLabels: Record<CvHistoryItem['source'], string> = {
    PRACTICAS_PE: 'Practicas.pe',
    COMPUTRABAJO: 'CompuTrabajo',
    MANUAL: 'Manual',
}

const sourceStyles: Record<CvHistoryItem['source'], { bg: string; text: string; border: string }> = {
    PRACTICAS_PE: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
    COMPUTRABAJO: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
    MANUAL: { bg: 'bg-surface-container-high', text: 'text-outline', border: 'border-white/5' },
}

export function CvHistoryListItem({ item, onRecompile, isRecompiling }: CvHistoryListItemProps) {
    const navigate = useNavigate()
    const sourceStyle = sourceStyles[item.source]

    const formatDate = (iso: string) => {
        const d = new Date(iso)
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    return (
        <TableRow className="border-b border-white/5 hover:bg-purple-500/5 transition-colors group">
            <TableCell className="font-medium text-white py-4 px-6">
                {item.job_title}
            </TableCell>
            <TableCell className="py-4 px-6 text-slate-300">
                {item.company}
            </TableCell>
            <TableCell className="py-4 px-6">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${sourceStyle.bg} ${sourceStyle.text} ${sourceStyle.border}`}>
                    {sourceLabels[item.source]}
                </span>
            </TableCell>
            <TableCell className="py-4 px-6 font-mono text-sm text-slate-400">
                {formatDate(item.created_at)}
            </TableCell>
<TableCell className="py-4 px-6 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => navigate(`/generated-cvs/${item.id}/edit`)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 text-outline hover:text-white hover:border-white/40 hover:bg-white/5 transition-all text-sm font-medium"
                    >
                        <Pencil className="h-4 w-4" />
                        Editar
                    </button>
                    <button
                        onClick={() => onRecompile(item)}
                        disabled={isRecompiling}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/60 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isRecompiling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileOutput className="h-4 w-4" />
                        )}
                        Ver/Recompilar
                    </button>
                </div>
            </TableCell>
        </TableRow>
    )
}