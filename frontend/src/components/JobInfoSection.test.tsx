import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { JobInfoSection } from './JobInfoSection'
import type { Job } from '@/types'

const MOCK_JOB: Job = {
    id: '1',
    title: 'Backend Developer',
    company: 'TechCorp',
    location: 'Lima, Remoto',
    salary: 'S/ 3,000',
    description: 'Buscamos desarrollador backend con experiencia en Python y FastAPI.',
    url: 'https://example.com/job',
    source: 'COMPUTRABAJO',
    status: 'SAVED',
    created_at: new Date().toISOString(),
}

describe('JobInfoSection', () => {
    it('renders job title', () => {
        render(<JobInfoSection job={MOCK_JOB} />)
        expect(screen.getByText('Backend Developer')).toBeInTheDocument()
    })

    it('renders company', () => {
        render(<JobInfoSection job={MOCK_JOB} />)
        expect(screen.getByText('TechCorp')).toBeInTheDocument()
    })

    it('renders location', () => {
        render(<JobInfoSection job={MOCK_JOB} />)
        expect(screen.getByText('Lima, Remoto')).toBeInTheDocument()
    })

    it('renders salary when present', () => {
        render(<JobInfoSection job={MOCK_JOB} />)
        expect(screen.getByText('S/ 3,000')).toBeInTheDocument()
    })

    it('renders full description', () => {
        render(<JobInfoSection job={MOCK_JOB} />)
        expect(screen.getByText(/Buscamos desarrollador backend con experiencia en Python y FastAPI/)).toBeInTheDocument()
    })

    it('renders source badge', () => {
        render(<JobInfoSection job={MOCK_JOB} />)
        expect(screen.getByText('COMPUTRABAJO')).toBeInTheDocument()
    })

    it('does not render salary when absent', () => {
        const jobWithoutSalary = { ...MOCK_JOB, salary: undefined }
        render(<JobInfoSection job={jobWithoutSalary} />)
        expect(screen.queryByText('S/ 3,000')).not.toBeInTheDocument()
    })

    it('renders parsed sections when source is PRACTICAS_PE and description has sections', () => {
        const practicasJob: Job = {
            ...MOCK_JOB,
            source: 'PRACTICAS_PE',
            description:
                'Requisitos Modalidad: Profesional Condiciones del contrato Lugar: Lima Como postular POSTULA AQUÍ',
        }
        render(<JobInfoSection job={practicasJob} />)
        expect(screen.getByText('Requisitos')).toBeInTheDocument()
        expect(screen.getByText('Condiciones del contrato')).toBeInTheDocument()
        expect(screen.getByText('Como postular')).toBeInTheDocument()
        expect(screen.getByText(/Modalidad: Profesional/)).toBeInTheDocument()
        expect(screen.getByText(/Lugar: Lima/)).toBeInTheDocument()
    })

    it('renders description as plain text when source is COMPUTRABAJO', () => {
        render(<JobInfoSection job={MOCK_JOB} />)
        expect(screen.getByText(/Buscamos desarrollador backend con experiencia en Python y FastAPI/)).toBeInTheDocument()
    })

    it('falls back to plain text when source is PRACTICAS_PE but description is empty or parser returns empty', () => {
        const emptyJob: Job = {
            ...MOCK_JOB,
            source: 'PRACTICAS_PE',
            description: '',
        }
        render(<JobInfoSection job={emptyJob} />)
        expect(screen.getByText('Backend Developer')).toBeInTheDocument()
    })
})
