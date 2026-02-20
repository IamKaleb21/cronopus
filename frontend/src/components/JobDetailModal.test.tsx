import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { JobDetailModal } from './JobDetailModal'
import type { Job } from '@/types'

const MOCK_JOB: Job = {
    id: '1',
    title: 'Backend Developer',
    company: 'TechCorp',
    location: 'Lima, Remoto',
    salary: 'S/ 3,000',
    description: 'Buscamos desarrollador backend con experiencia en Python.',
    url: 'https://computrabajo.pe/job/123',
    source: 'COMPUTRABAJO',
    status: 'SAVED',
    created_at: new Date().toISOString(),
}

describe('JobDetailModal', () => {
    it('renders job details when open', () => {
        render(
            <JobDetailModal job={MOCK_JOB} open={true} onOpenChange={() => {}} />
        )
        expect(screen.getByText('Backend Developer')).toBeInTheDocument()
        expect(screen.getByText('TechCorp')).toBeInTheDocument()
        expect(screen.getByText(/Buscamos desarrollador backend/)).toBeInTheDocument()
    })

    it('renders Ver Oferta link with correct href', () => {
        render(
            <JobDetailModal job={MOCK_JOB} open={true} onOpenChange={() => {}} />
        )
        const link = screen.getByRole('link', { name: /ver oferta/i })
        expect(link).toHaveAttribute('href', 'https://computrabajo.pe/job/123')
        expect(link).toHaveAttribute('target', '_blank')
    })

    it('does not render when open is false', () => {
        render(
            <JobDetailModal job={MOCK_JOB} open={false} onOpenChange={() => {}} />
        )
        expect(screen.queryByText('Backend Developer')).not.toBeInTheDocument()
    })

    it('does not render when job is null', () => {
        render(
            <JobDetailModal job={null} open={true} onOpenChange={() => {}} />
        )
        expect(screen.queryByText('Backend Developer')).not.toBeInTheDocument()
    })

    it('shows Marcar como vencida button when job is not EXPIRED and calls onMarkExpired on click', async () => {
        const onMarkExpired = vi.fn()
        const user = userEvent.setup()
        render(
            <JobDetailModal
                job={MOCK_JOB}
                open={true}
                onOpenChange={() => {}}
                onMarkExpired={onMarkExpired}
            />
        )
        const button = screen.getByRole('button', { name: /marcar como vencida/i })
        expect(button).toBeInTheDocument()
        await user.click(button)
        expect(onMarkExpired).toHaveBeenCalledTimes(1)
        expect(onMarkExpired).toHaveBeenCalledWith(MOCK_JOB)
    })

    it('does not show Marcar como vencida button when job status is EXPIRED', () => {
        const onMarkExpired = vi.fn()
        render(
            <JobDetailModal
                job={{ ...MOCK_JOB, status: 'EXPIRED' }}
                open={true}
                onOpenChange={() => {}}
                onMarkExpired={onMarkExpired}
            />
        )
        expect(screen.queryByRole('button', { name: /marcar como vencida/i })).not.toBeInTheDocument()
    })
})
