import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCreateJob } from './useJobs'

vi.mock('@/services/api', () => ({
    jobsApi: {
        create: vi.fn(),
        getAll: vi.fn(),
        updateStatus: vi.fn(),
    },
}))

import { jobsApi } from '@/services/api'

beforeEach(() => {
    vi.clearAllMocks()
})

describe('useCreateJob', () => {
    it('invalidates jobs query on success', async () => {
        vi.mocked(jobsApi.create).mockResolvedValue({
            id: 'new-id',
            title: 'Manual Job',
            company: 'Acme',
            location: 'Lima',
            description: 'Desc',
            url: 'https://example.com',
            source: 'MANUAL',
            status: 'SAVED',
            created_at: new Date().toISOString(),
        } as Awaited<ReturnType<typeof jobsApi.create>>)

        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        )

        const { result } = renderHook(() => useCreateJob(), { wrapper })

        result.current.mutate({
            title: 'Manual Job',
            company: 'Acme',
            location: 'Lima',
            description: 'Desc',
            url: 'https://example.com',
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['jobs'] })
    })
})
