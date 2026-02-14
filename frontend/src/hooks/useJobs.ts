import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobsApi } from '@/services/api'
import type { Job, JobStatus } from '@/types'

export const JOBS_QUERY_KEY = ['jobs'] as const

/**
 * Hook to fetch all jobs from the backend.
 * Provides loading, error, and data states automatically.
 * @param enabled - Set to false to disable the query (e.g., when using local data)
 */
export function useJobs(enabled = true) {
    return useQuery<Job[]>({
        queryKey: JOBS_QUERY_KEY,
        queryFn: jobsApi.getAll,
        enabled,
    })
}

/**
 * Hook to create a manual job.
 * Invalidates jobs query on success. Task 4.8.
 */
export function useCreateJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (body: {
            title: string
            company: string
            location: string
            description: string
            url: string
            salary?: string | null
        }) => jobsApi.create(body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY })
        },
    })
}

/**
 * Hook to update a job's status.
 * Automatically invalidates the jobs query on success to refetch data.
 */
export function useUpdateJobStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ jobId, status }: { jobId: string; status: JobStatus }) =>
            jobsApi.updateStatus(jobId, status),
        onSuccess: () => {
            // Invalidate and refetch jobs list
            queryClient.invalidateQueries({ queryKey: JOBS_QUERY_KEY })
        },
    })
}
