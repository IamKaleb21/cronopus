import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import History from './History'
import type { CvHistoryItem } from '@/types'

vi.mock('@/services/api', () => ({
    cvsApi: {
        getList: vi.fn(),
        recompile: vi.fn(),
    },
}))

import { cvsApi } from '@/services/api'

const MOCK_CVS: CvHistoryItem[] = [
    { id: 'cv-1', job_id: '1', job_title: 'Backend Developer Jr', company: 'TechCorp Perú', source: 'COMPUTRABAJO', created_at: '2026-02-09T14:30:00Z' },
    { id: 'cv-2', job_id: '2', job_title: 'Full Stack', company: 'StartupXYZ', source: 'PRACTICAS_PE', created_at: '2026-02-08T16:00:00Z' },
    { id: 'cv-3', job_id: '3', job_title: 'Software Engineer', company: 'Banco Digital', source: 'MANUAL', created_at: '2026-02-07T11:00:00Z' },
]

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    })

const renderHistory = () => {
    const queryClient = createTestQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <History />
            </BrowserRouter>
        </QueryClientProvider>
    )
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cvsApi.getList).mockResolvedValue(MOCK_CVS)
})

describe('History page', () => {
    it('renders the Historial title', async () => {
        renderHistory()
        expect(screen.getByRole('heading', { name: /historial/i })).toBeInTheDocument()
    })

    it('shows list of CVs after loading', async () => {
        renderHistory()
        await waitFor(() => {
            expect(cvsApi.getList).toHaveBeenCalled()
        })
        await waitFor(() => {
            expect(screen.getByText('Backend Developer Jr')).toBeInTheDocument()
            expect(screen.getByText('TechCorp Perú')).toBeInTheDocument()
            expect(screen.getByText('Full Stack')).toBeInTheDocument()
            expect(screen.getByText('StartupXYZ')).toBeInTheDocument()
        })
    })

    it('filters by company when company filter is used', async () => {
        const user = userEvent.setup()
        vi.mocked(cvsApi.getList).mockResolvedValueOnce(MOCK_CVS).mockResolvedValueOnce([MOCK_CVS[0]])
        renderHistory()
        await waitFor(() => expect(screen.getByText('TechCorp Perú')).toBeInTheDocument())
        const companyInput = screen.getByPlaceholderText(/empresa/i) || screen.getByLabelText(/empresa/i)
        await user.type(companyInput, 'TechCorp')
        await user.tab()
        await waitFor(() => {
            expect(cvsApi.getList).toHaveBeenLastCalledWith(expect.objectContaining({ company: 'TechCorp' }))
        })
    })

    it('filters by date range when from/to are set', async () => {
        const user = userEvent.setup()
        renderHistory()
        await waitFor(() => expect(screen.getByText('Backend Developer Jr')).toBeInTheDocument())
        const fromInput = screen.getByLabelText(/desde|from/i) || document.querySelector('input[type="date"]')
        if (fromInput) {
            await user.type(fromInput, '2026-02-08')
            await waitFor(() => {
                expect(cvsApi.getList).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-02-08' }))
            })
        }
    })

    it('shows Ver/Recompilar button on each CV card', async () => {
        renderHistory()
        await waitFor(() => expect(screen.getByText('Backend Developer Jr')).toBeInTheDocument())
        const recompileButtons = screen.getAllByRole('button', { name: /ver|recompilar/i })
        expect(recompileButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('opens result modal and shows download after recompile', async () => {
        const user = userEvent.setup()
        const blob = new Blob(['%PDF'], { type: 'application/pdf' })
        vi.mocked(cvsApi.recompile).mockResolvedValue(blob)
        renderHistory()
        await waitFor(() => expect(screen.getByText('Backend Developer Jr')).toBeInTheDocument())
        const firstRecompile = screen.getAllByRole('button', { name: /ver|recompilar/i })[0]
        await user.click(firstRecompile)
        await waitFor(() => expect(cvsApi.recompile).toHaveBeenCalledWith('cv-1'))
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /descargar/i })).toBeInTheDocument()
        })
    })

    it('shows empty state when no CVs', async () => {
        vi.mocked(cvsApi.getList).mockResolvedValue([])
        renderHistory()
        await waitFor(() => expect(cvsApi.getList).toHaveBeenCalled())
        await waitFor(() => {
            expect(screen.getByText(/no hay|aún no|ningún cv/i)).toBeInTheDocument()
        })
    })
})
