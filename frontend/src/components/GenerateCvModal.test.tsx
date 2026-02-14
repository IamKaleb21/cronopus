import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GenerateCvModal } from './GenerateCvModal'
import type { Job } from '@/types'

// Mock the API module
vi.mock('@/services/api', () => ({
    jobsApi: {
        generateCv: vi.fn(),
    },
}))

import { jobsApi } from '@/services/api'

const MOCK_JOB: Job = {
    id: 'job-1',
    title: 'Backend Developer',
    company: 'TechCorp',
    location: 'Lima, Remoto',
    salary: 'S/ 3,000',
    description: 'Buscamos desarrollador backend con experiencia en Python y FastAPI.',
    url: '#',
    source: 'COMPUTRABAJO',
    status: 'SAVED',
    created_at: new Date().toISOString(),
}

const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})

const renderModal = (props: Partial<React.ComponentProps<typeof GenerateCvModal>> = {}) => {
    const queryClient = createTestQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <GenerateCvModal
                job={MOCK_JOB}
                open={true}
                onOpenChange={() => { }}
                {...props}
            />
        </QueryClientProvider>
    )
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('GenerateCvModal', () => {
    it('renders job details when open', () => {
        renderModal()

        expect(screen.getByText('Backend Developer')).toBeInTheDocument()
        expect(screen.getByText('TechCorp')).toBeInTheDocument()
        expect(screen.getByText(/lima, remoto/i)).toBeInTheDocument()
        expect(screen.getByText(/python y fastapi/i)).toBeInTheDocument()
    })

    it('renders "Generar CV con IA" button', () => {
        renderModal()
        expect(screen.getByRole('button', { name: /generar cv con ia/i })).toBeInTheDocument()
    })

    it('shows loading state during generation', async () => {
        const user = userEvent.setup()

        // Make generateCv hang (never resolve)
        vi.mocked(jobsApi.generateCv).mockReturnValue(new Promise(() => { }))

        renderModal()

        const generateButton = screen.getByRole('button', { name: /generar cv con ia/i })
        await user.click(generateButton)

        expect(screen.getByText(/generando/i)).toBeInTheDocument()
    })

    it('shows PDF result and download button after generation', async () => {
        const user = userEvent.setup()
        const mockBlob = new Blob(['fake-pdf'], { type: 'application/pdf' })

        vi.mocked(jobsApi.generateCv).mockResolvedValue(mockBlob)

        renderModal()

        const generateButton = screen.getByRole('button', { name: /generar cv con ia/i })
        await user.click(generateButton)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /descargar pdf/i })).toBeInTheDocument()
        })

        expect(jobsApi.generateCv).toHaveBeenCalledWith('job-1')
    })

    it('does not render when open is false', () => {
        renderModal({ open: false })
        expect(screen.queryByText('Backend Developer')).not.toBeInTheDocument()
    })
})
