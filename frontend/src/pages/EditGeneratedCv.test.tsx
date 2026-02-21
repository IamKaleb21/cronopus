import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import EditGeneratedCv from './EditGeneratedCv'
import type { AdaptedContent } from '@/types'

vi.mock('@/services/api', () => ({
    cvsApi: {
        getAdapted: vi.fn(),
        updateAdapted: vi.fn(),
        recompile: vi.fn(),
    },
}))

import { cvsApi } from '@/services/api'

const MOCK_ADAPTED: AdaptedContent = {
    summary: 'Resumen adaptado.',
    experience_adapted: [{ experience_id: 'exp-1', bullets: ['Bullet one.'] }],
    projects_adapted: [{ project_id: 'proj-1', bullets: ['Project bullet.'] }],
    skills_adapted: { languages: ['Python', 'TypeScript'] },
}

const renderWithRoute = (cvId = 'cv-123') => {
    return render(
        <MemoryRouter initialEntries={[`/generated-cvs/${cvId}/edit`]}>
            <Routes>
                <Route path="/generated-cvs/:id/edit" element={<EditGeneratedCv />} />
            </Routes>
        </MemoryRouter>
    )
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('EditGeneratedCv page', () => {
    it('shows loading then form when getAdapted returns data', async () => {
        vi.mocked(cvsApi.getAdapted).mockResolvedValue(MOCK_ADAPTED)
        renderWithRoute('cv-1')
        await waitFor(() => expect(cvsApi.getAdapted).toHaveBeenCalledWith('cv-1'))
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /editar contenido adaptado/i })).toBeInTheDocument()
        })
        expect(screen.getByDisplayValue(/Resumen adaptado/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument()
    })

    it('shows no editable message and link when getAdapted returns 404', async () => {
        vi.mocked(cvsApi.getAdapted).mockRejectedValue({ response: { status: 404 } })
        renderWithRoute('cv-legacy')
        await waitFor(() => expect(cvsApi.getAdapted).toHaveBeenCalled())
        await waitFor(() => {
            expect(screen.getByText(/no se puede editar/i)).toBeInTheDocument()
        })
        expect(screen.getByRole('link', { name: /volver a CVs Generados/i })).toBeInTheDocument()
    })
})
