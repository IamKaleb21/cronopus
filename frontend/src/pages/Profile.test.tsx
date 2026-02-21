import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Profile from './Profile'
import type { ProfileJson } from '@/services/api'

vi.mock('@/services/api', () => ({
    profileApi: {
        get: vi.fn(),
        update: vi.fn(),
    },
}))

import { profileApi } from '@/services/api'

const MOCK_PROFILE: ProfileJson = {
    full_name: 'Test User',
    title: 'Developer',
    contact: { phone: '+51', email: 't@t.com', location: 'Lima', links: {} },
    summary: 'Summary',
    skills: {},
    experience: [],
    projects: [],
    education: [],
    certifications: [],
}

function renderProfile() {
    return render(
        <MemoryRouter>
            <Profile />
        </MemoryRouter>
    )
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('Profile page', () => {
    it('shows loading then form when GET succeeds', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(MOCK_PROFILE)
        renderProfile()

        expect(screen.getByText(/cargando perfil/i)).toBeInTheDocument()

        await waitFor(() => {
            expect(screen.getByText(/datos básicos/i)).toBeInTheDocument()
        })
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Developer')).toBeInTheDocument()
    })

    it('shows error and Reintentar when GET fails with 503', async () => {
        vi.mocked(profileApi.get).mockRejectedValue(new Error('Profile no configurado. Ejecuta seed_profile.'))
        renderProfile()

        await waitFor(() => {
            expect(screen.getByText(/no configurado|seed_profile/i)).toBeInTheDocument()
        })
        expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
    })

    it('calls loadProfile again when Reintentar is clicked', async () => {
        vi.mocked(profileApi.get)
            .mockRejectedValueOnce(new Error('Profile no configurado.'))
            .mockResolvedValueOnce(MOCK_PROFILE)
        const user = userEvent.setup()
        renderProfile()

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
        })
        await user.click(screen.getByRole('button', { name: /reintentar/i }))

        await waitFor(() => {
            expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
        })
        expect(profileApi.get).toHaveBeenCalledTimes(2)
    })

    it('calls profileApi.update when Guardar is clicked', async () => {
        vi.mocked(profileApi.get).mockResolvedValue(MOCK_PROFILE)
        vi.mocked(profileApi.update).mockResolvedValue(MOCK_PROFILE)
        const user = userEvent.setup()
        renderProfile()

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument()
        })
        await user.click(screen.getByRole('button', { name: /guardar/i }))

        await waitFor(() => {
            expect(profileApi.update).toHaveBeenCalledWith(MOCK_PROFILE)
        })
    })

    })
