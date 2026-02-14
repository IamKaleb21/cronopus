import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './Dashboard'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import type { Job } from '@/types'

// Mock the API module
vi.mock('@/services/api', () => ({
    jobsApi: {
        getAll: vi.fn(),
        updateStatus: vi.fn(),
    },
}))

import { jobsApi } from '@/services/api'

// Mock Job Template
const MOCK_JOB_TEMPLATE: Job = {
    id: "1",
    title: "Test Job",
    company: "Test Company",
    location: "Remote",
    salary: "$1000",
    description: "Description",
    url: "#",
    source: "COMPUTRABAJO",
    status: "NEW",
    created_at: new Date().toISOString()
}

// Helper to create QueryClient for tests (no retries)
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
        mutations: {
            retry: false,
        },
    },
})

function SearchReader() {
    const [params] = useSearchParams()
    return <span data-testid="search">{params.toString()}</span>
}

// Helper to render with router and QueryClientProvider
const renderDashboard = (props: any = {}, initialEntry = '/') => {
    const queryClient = createTestQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[initialEntry]}>
                <Dashboard {...props} />
                <SearchReader />
            </MemoryRouter>
        </QueryClientProvider>
    )
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('Dashboard Pagination', () => {
    it('renders the dashboard title', () => {
        renderDashboard({ initialJobs: [] })
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('renders correct number of items per page', () => {
        // Create 20 mock jobs
        const manyJobs = Array.from({ length: 20 }).map((_, i) => ({
            ...MOCK_JOB_TEMPLATE,
            id: String(i),
            title: `Job ${i}`,
            status: 'NEW' as const
        }))

        // Pass itemsPerPage and initialJobs
        renderDashboard({ initialJobs: manyJobs, itemsPerPage: 8 })

        // Should show only 8 items
        const jobCards = screen.getAllByRole('heading', { level: 3 })
        expect(jobCards).toHaveLength(8)
        expect(screen.getByText('Job 0')).toBeInTheDocument()
        expect(screen.queryByText('Job 8')).not.toBeInTheDocument()
    })

    it('navigates to next page', async () => {
        const user = userEvent.setup()
        const manyJobs = Array.from({ length: 20 }).map((_, i) => ({
            ...MOCK_JOB_TEMPLATE,
            id: String(i),
            title: `Job ${i}`,
            status: 'NEW' as const
        }))

        renderDashboard({ initialJobs: manyJobs, itemsPerPage: 8 })

        const nextButton = screen.getByRole('link', { name: /next/i })

        await user.click(nextButton)

        // Should now show Job 8
        expect(screen.getByText('Job 8')).toBeInTheDocument()
        expect(screen.queryByText('Job 0')).not.toBeInTheDocument()
    })

    it('resets to page 1 when switching tabs', async () => {
        const user = userEvent.setup()
        const manyJobs = Array.from({ length: 20 }).map((_, i) => ({
            ...MOCK_JOB_TEMPLATE,
            id: String(i),
            title: `Job ${i}`,
            // Mixed statuses
            status: i % 2 === 0 ? 'NEW' : 'SAVED'
        })) as Job[]

        renderDashboard({ initialJobs: manyJobs, itemsPerPage: 5 })

        // On ALL tab (default), page 1.
        expect(screen.getByText('Job 0')).toBeInTheDocument()

        // Go to page 2 (Use Next button)
        const nextButton = screen.getByRole('link', { name: /next/i })
        await user.click(nextButton)
        expect(screen.getByText('Job 5')).toBeInTheDocument()

        // Switch to SAVED tab
        const savedTab = screen.getByRole('tab', { name: /guardadas/i })
        await user.click(savedTab)

        // Should be on page 1 of SAVED tab.
        // First SAVED job is Job 1.
        expect(screen.getByText('Job 1')).toBeInTheDocument()
    })

    it('updates job status when "Mark as Applied" is clicked', async () => {
        const user = userEvent.setup()
        const initialJobs = [{ ...MOCK_JOB_TEMPLATE, title: 'Test Job', status: 'NEW' as const }]

        renderDashboard({ initialJobs })

        // Ensure job is visible
        expect(screen.getByText('Test Job')).toBeInTheDocument()
        expect(screen.getByText('NEW')).toBeInTheDocument()

        const markAppliedButton = screen.getByRole('button', { name: /marcar como postulado/i })
        await user.click(markAppliedButton)

        // Status should change to APPLIED
        expect(screen.getByText('APPLIED')).toBeInTheDocument()
    })
})

describe('Dashboard API Integration', () => {
    it('fetches jobs from API when no initialJobs provided', async () => {
        const mockJobs: Job[] = [
            { ...MOCK_JOB_TEMPLATE, id: 'api-1', title: 'API Job 1' },
            { ...MOCK_JOB_TEMPLATE, id: 'api-2', title: 'API Job 2' },
        ]

        vi.mocked(jobsApi.getAll).mockResolvedValue(mockJobs)

        renderDashboard()

        // Should show loading state initially
        expect(screen.getByText(/cargando/i)).toBeInTheDocument()

        // Wait for API data to load
        await waitFor(() => {
            expect(screen.getByText('API Job 1')).toBeInTheDocument()
        })
        expect(screen.getByText('API Job 2')).toBeInTheDocument()
        expect(jobsApi.getAll).toHaveBeenCalledOnce()
    })

    it('shows error state when API fails', async () => {
        vi.mocked(jobsApi.getAll).mockRejectedValue(new Error('Network Error'))

        renderDashboard()

        await waitFor(() => {
            expect(screen.getByText(/error/i)).toBeInTheDocument()
        })
    })

    it('calls API to update status when marking as applied (API mode)', async () => {
        const user = userEvent.setup()
        const mockJobs: Job[] = [
            { ...MOCK_JOB_TEMPLATE, id: 'api-1', title: 'API Job', status: 'NEW' },
        ]

        vi.mocked(jobsApi.getAll).mockResolvedValue(mockJobs)
        vi.mocked(jobsApi.updateStatus).mockResolvedValue({ ...mockJobs[0], status: 'APPLIED' })

        renderDashboard()

        // Wait for data
        await waitFor(() => {
            expect(screen.getByText('API Job')).toBeInTheDocument()
        })

        // Click mark as applied
        const markAppliedButton = screen.getByRole('button', { name: /marcar como postulado/i })
        await user.click(markAppliedButton)

        // Should call API
        await waitFor(() => {
            expect(jobsApi.updateStatus).toHaveBeenCalledWith('api-1', 'APPLIED')
        })
    })
})

describe('Dashboard URL filters', () => {
    it('filters jobs by status when URL has ?status=SAVED', () => {
        const jobs: Job[] = [
            { ...MOCK_JOB_TEMPLATE, id: '1', title: 'Job A', status: 'NEW' },
            { ...MOCK_JOB_TEMPLATE, id: '2', title: 'Job B', status: 'SAVED' },
            { ...MOCK_JOB_TEMPLATE, id: '3', title: 'Job C', status: 'SAVED' },
        ]
        renderDashboard({ initialJobs: jobs }, '/?status=SAVED')
        expect(screen.getByText('Job B')).toBeInTheDocument()
        expect(screen.getByText('Job C')).toBeInTheDocument()
        expect(screen.queryByText('Job A')).not.toBeInTheDocument()
    })

    it('filters jobs by source when URL has ?source=PRACTICAS_PE', () => {
        const jobs: Job[] = [
            { ...MOCK_JOB_TEMPLATE, id: '1', title: 'Job A', source: 'COMPUTRABAJO' },
            { ...MOCK_JOB_TEMPLATE, id: '2', title: 'Job B', source: 'PRACTICAS_PE' },
        ]
        renderDashboard({ initialJobs: jobs }, '/?source=PRACTICAS_PE')
        expect(screen.getByText('Job B')).toBeInTheDocument()
        expect(screen.queryByText('Job A')).not.toBeInTheDocument()
    })

    it('filters jobs by both status and source when URL has both params', () => {
        const jobs: Job[] = [
            { ...MOCK_JOB_TEMPLATE, id: '1', title: 'A', status: 'SAVED', source: 'COMPUTRABAJO' },
            { ...MOCK_JOB_TEMPLATE, id: '2', title: 'B', status: 'SAVED', source: 'PRACTICAS_PE' },
            { ...MOCK_JOB_TEMPLATE, id: '3', title: 'C', status: 'NEW', source: 'PRACTICAS_PE' },
        ]
        renderDashboard({ initialJobs: jobs }, '/?status=SAVED&source=PRACTICAS_PE')
        expect(screen.getByText('B')).toBeInTheDocument()
        expect(screen.queryByText('A')).not.toBeInTheDocument()
        expect(screen.queryByText('C')).not.toBeInTheDocument()
    })

    it('tab click updates URL with status param', async () => {
        const user = userEvent.setup()
        const jobs: Job[] = [{ ...MOCK_JOB_TEMPLATE, id: '1', title: 'Job', status: 'SAVED' }]
        renderDashboard({ initialJobs: jobs })
        const guardadasTab = screen.getByRole('tab', { name: /guardadas/i })
        await user.click(guardadasTab)
        expect(screen.getByTestId('search')).toHaveTextContent('status=SAVED')
    })

    it('includes tabs for Aplicadas, Vencidas, Descartadas', () => {
        renderDashboard({ initialJobs: [] })
        expect(screen.getByRole('tab', { name: /aplicadas/i })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: /vencidas/i })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: /descartadas/i })).toBeInTheDocument()
    })

    it('opens JobDetailModal when Ver Detalle is clicked', async () => {
        const user = userEvent.setup()
        const jobs = [{ ...MOCK_JOB_TEMPLATE, id: '1', title: 'Backend Dev', description: 'Full description here' }]
        renderDashboard({ initialJobs: jobs })

        const verDetalleBtn = screen.getByRole('button', { name: /ver detalle/i })
        await user.click(verDetalleBtn)

        const dialog = screen.getByRole('dialog', { name: /detalle de la oferta/i })
        expect(dialog).toBeInTheDocument()
        const withinDialog = within(dialog)
        expect(withinDialog.getByText('Backend Dev')).toBeInTheDocument()
        expect(withinDialog.getByText(/full description here/i)).toBeInTheDocument()
    })
})
