import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cvsApi } from '@/services/api'
import type { CvHistoryItem } from '@/types'

export const CVS_QUERY_KEY = 'cvs' as const

export type CvFilters = {
    company?: string
    from?: string
    to?: string
}

export function useCvs(filters?: CvFilters) {
    return useQuery<CvHistoryItem[]>({
        queryKey: [CVS_QUERY_KEY, filters ?? {}],
        queryFn: () => cvsApi.getList(filters),
    })
}

export function useRecompileCv() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => cvsApi.recompile(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CVS_QUERY_KEY] })
        },
    })
}
