import { render, screen } from '@testing-library/react'
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

describe('AppSidebar', () => {
    it('renders navigation: Dashboard, Plantillas, Historial, Perfil', () => {
        renderSidebar('/')
        expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /plantillas/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /historial/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /perfil/i })).toBeInTheDocument()
    })

    it('Perfil link points to /profile', () => {
        renderSidebar('/')
        const perfilLink = screen.getByRole('link', { name: /perfil/i })
        expect(perfilLink).toHaveAttribute('href', '/profile')
    })

    it('shows job count badge on Dashboard link when on dashboard', () => {
        const jobs: Job[] = [
            { ...MOCK_JOB, id: '1' },
            { ...MOCK_JOB, id: '2' },
        ]
        renderSidebar('/', jobs)
        const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
        expect(dashboardLink).toHaveTextContent('2')
    })

    it('renders Scrapers activos and Cerrar sesión in footer', () => {
        renderSidebar('/')
        expect(screen.getByText(/scrapers activos/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument()
    })

    it('renders CronOpus logo in header', () => {
        renderSidebar('/')
        expect(screen.getByText('CronOpus')).toBeInTheDocument()
    })
})
