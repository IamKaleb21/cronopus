import { useSearchParams } from 'react-router-dom'
import type { JobStatus } from '@/types'

type JobSource = 'PRACTICAS_PE' | 'COMPUTRABAJO' | 'MANUAL'

const VALID_STATUSES: JobStatus[] = ['NEW', 'SAVED', 'DISCARDED', 'GENERATED', 'APPLIED', 'EXPIRED']
const VALID_SOURCES: JobSource[] = ['PRACTICAS_PE', 'COMPUTRABAJO', 'MANUAL']

function isValidStatus(s: string | null): s is JobStatus {
    return s !== null && VALID_STATUSES.includes(s as JobStatus)
}

function isValidSource(s: string | null): s is JobSource {
    return s !== null && VALID_SOURCES.includes(s as JobSource)
}

export function useJobFilters(): {
    status: JobStatus | null
    source: JobSource | null
    setStatus: (s: JobStatus | null) => void
    setSource: (s: JobSource | null) => void
    clearFilters: () => void
} {
    const [searchParams, setSearchParams] = useSearchParams()

    const statusParam = searchParams.get('status')
    const sourceParam = searchParams.get('source')

    const status: JobStatus | null = isValidStatus(statusParam) ? statusParam : null
    const source: JobSource | null = isValidSource(sourceParam) ? sourceParam : null

    const setStatus = (s: JobStatus | null) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            if (s === null) {
                next.delete('status')
            } else {
                next.set('status', s)
            }
            return next
        })
    }

    const setSource = (s: JobSource | null) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            if (s === null) {
                next.delete('source')
            } else {
                next.set('source', s)
            }
            return next
        })
    }

    const clearFilters = () => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.delete('status')
            next.delete('source')
            return next
        })
    }

    return { status, source, setStatus, setSource, clearFilters }
}
