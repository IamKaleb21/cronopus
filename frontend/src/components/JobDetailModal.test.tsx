import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
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
})
