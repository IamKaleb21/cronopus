import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from './app-sidebar'
import type { Job } from '@/types'

vi.mock('@/lib/auth', () => ({
    clearStoredToken: vi.fn(),
}))

vi.mock('@/hooks/useJobs', () => ({
    useJobs: vi.fn(),
}))

import { useJobs } from '@/hooks/useJobs'

const MOCK_JOB: Job = {
    id: '1',
    title: 'Test',
    company: 'Co',
    location: 'Lima',
    description: 'Desc',
    url: '#',
    source: 'COMPUTRABAJO',
    status: 'NEW',
    created_at: new Date().toISOString(),
}

function SearchReader() {
    const [params] = useSearchParams()
    return <span data-testid="search">{params.toString()}</span>
}

function renderSidebar(initialEntry = '/', jobs: Job[] = []) {
    vi.mocked(useJobs).mockReturnValue({
        data: jobs,
        isLoading: false,
        isError: false,
    } as ReturnType<typeof useJobs>)

    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[initialEntry]}>
                <SidebarProvider defaultOpen={true}>
                    <TooltipProvider>
                        <AppSidebar />
                        <SearchReader />
                    </TooltipProvider>
                </SidebarProvider>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    })
})

describe('AppSidebar filters', () => {
    it('shows real counts from jobs for status filters', () => {
        const jobs: Job[] = [
            { ...MOCK_JOB, id: '1', status: 'NEW' },
            { ...MOCK_JOB, id: '2', status: 'NEW' },
            { ...MOCK_JOB, id: '3', status: 'SAVED' },
            { ...MOCK_JOB, id: '4', status: 'SAVED' },
            { ...MOCK_JOB, id: '5', status: 'SAVED' },
            { ...MOCK_JOB, id: '6', status: 'DISCARDED' },
        ]
        renderSidebar('/', jobs)

        const nuevasBtn = screen.getByRole('button', { name: /nuevas/i })
        const guardadasBtn = screen.getByRole('button', { name: /guardadas/i })
        const descartadasBtn = screen.getByRole('button', { name: /descartadas/i })
        expect(nuevasBtn).toHaveTextContent('2')
        expect(guardadasBtn).toHaveTextContent('3')
        expect(descartadasBtn).toHaveTextContent('1')
    })

    it('includes Descartadas in status filters', () => {
        renderSidebar('/')
        expect(screen.getByText('Descartadas')).toBeInTheDocument()
    })

    it('clicking Guardadas updates URL with status=SAVED', async () => {
        const user = userEvent.setup()
        renderSidebar('/')
        const guardadas = screen.getByRole('button', { name: /guardadas/i })
        await user.click(guardadas)
        expect(screen.getByTestId('search')).toHaveTextContent('status=SAVED')
    })

    it('clicking CompuTrabajo source updates URL with source=COMPUTRABAJO', async () => {
        const user = userEvent.setup()
        renderSidebar('/')
        const ct = screen.getByRole('button', { name: /computrabajo/i })
        await user.click(ct)
        expect(screen.getByTestId('search')).toHaveTextContent('source=COMPUTRABAJO')
    })

    it('active status filter has data-active when URL has matching status', () => {
        renderSidebar('/?status=SAVED')
        const guardadas = screen.getByRole('button', { name: /guardadas/i })
        expect(guardadas).toHaveAttribute('data-active', 'true')
    })
})
