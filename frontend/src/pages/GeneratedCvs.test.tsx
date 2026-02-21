import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import GeneratedCvs from './GeneratedCvs'
import type { CvHistoryItem } from '@/types'

vi.mock('@/services/api', () => ({
    cvsApi: {
        getList: vi.fn(),
        getAdapted: vi.fn(),
        updateAdapted: vi.fn(),
        recompile: vi.fn(),
    },
}))

import { cvsApi } from '@/services/api'

const MOCK_CVS: CvHistoryItem[] = [
    { id: 'cv-1', job_id: '1', job_title: 'Backend Dev', company: 'TechCorp', source: 'COMPUTRABAJO', location: 'Lima', created_at: '2026-02-09T14:30:00Z' },
    { id: 'cv-2', job_id: '2', job_title: 'Full Stack', company: 'StartupXYZ', source: 'PRACTICAS_PE', location: 'Remoto', created_at: '2026-02-08T16:00:00Z' },
]

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    })

const renderGeneratedCvs = () => {
    const queryClient = createTestQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <GeneratedCvs />
            </BrowserRouter>
        </QueryClientProvider>
    )
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cvsApi.getList).mockResolvedValue(MOCK_CVS)
})

describe('GeneratedCvs page', () => {
    it('renders the CVs Generados title', async () => {
        renderGeneratedCvs()
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /CVs Generados/i })).toBeInTheDocument()
        })
    })

    it('shows filters for Ubicación and Fuente', async () => {
        renderGeneratedCvs()
        await waitFor(() => expect(screen.getByText('Backend Dev')).toBeInTheDocument())
        expect(screen.getByRole('combobox', { name: /ubicación/i })).toBeInTheDocument()
        expect(screen.getByRole('combobox', { name: /fuente/i })).toBeInTheDocument()
    })

    it('shows cards with Editar after loading', async () => {
        renderGeneratedCvs()
        await waitFor(() => expect(screen.getByText('Backend Dev')).toBeInTheDocument())
        expect(screen.getByText('TechCorp')).toBeInTheDocument()
        const editButtons = screen.getAllByRole('button', { name: /editar/i })
        expect(editButtons.length).toBeGreaterThanOrEqual(1)
    })
})
