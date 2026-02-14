import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddJobModal } from './AddJobModal'

vi.mock('@/services/api', () => ({
    jobsApi: {
        create: vi.fn(),
    },
}))

import { jobsApi } from '@/services/api'

const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})

const renderModal = (props: Partial<React.ComponentProps<typeof AddJobModal>> = {}) => {
    const queryClient = createTestQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <AddJobModal
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

describe('AddJobModal', () => {
    it('renders form fields', () => {
        renderModal()

        expect(screen.getByLabelText(/título/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/empresa/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/ubicación/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/url/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/salario/i)).toBeInTheDocument()
    })

    it('submit calls jobsApi.create with correct data', async () => {
        const user = userEvent.setup()
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

        renderModal()

        await user.type(screen.getByLabelText(/título/i), 'Manual Job')
        await user.type(screen.getByLabelText(/empresa/i), 'Acme')
        await user.type(screen.getByLabelText(/ubicación/i), 'Lima')
        await user.type(screen.getByLabelText(/url/i), 'https://example.com')
        await user.type(screen.getByLabelText(/descripción/i), 'Desc')

        const submitButton = screen.getByRole('button', { name: /agregar/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(jobsApi.create).toHaveBeenCalledWith({
                title: 'Manual Job',
                company: 'Acme',
                location: 'Lima',
                description: 'Desc',
                url: 'https://example.com',
                salary: undefined,
            })
        })
    })

    it('onSuccess called after create and modal closes', async () => {
        const user = userEvent.setup()
        const onSuccess = vi.fn()
        const onOpenChange = vi.fn()

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

        renderModal({ onSuccess, onOpenChange })

        await user.type(screen.getByLabelText(/título/i), 'Manual Job')
        await user.type(screen.getByLabelText(/empresa/i), 'Acme')
        await user.type(screen.getByLabelText(/ubicación/i), 'Lima')
        await user.type(screen.getByLabelText(/url/i), 'https://example.com')
        await user.type(screen.getByLabelText(/descripción/i), 'Desc')

        await user.click(screen.getByRole('button', { name: /agregar/i }))

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalled()
            expect(onOpenChange).toHaveBeenCalledWith(false)
        })
    })

    it('shows error on API failure', async () => {
        const user = userEvent.setup()
        vi.mocked(jobsApi.create).mockRejectedValue(new Error('Network error'))

        renderModal()

        await user.type(screen.getByLabelText(/título/i), 'Manual Job')
        await user.type(screen.getByLabelText(/empresa/i), 'Acme')
        await user.type(screen.getByLabelText(/ubicación/i), 'Lima')
        await user.type(screen.getByLabelText(/url/i), 'https://example.com')
        await user.type(screen.getByLabelText(/descripción/i), 'Desc')

        await user.click(screen.getByRole('button', { name: /agregar/i }))

        await waitFor(() => {
            expect(screen.getByText(/error/i)).toBeInTheDocument()
        })
    })
})
