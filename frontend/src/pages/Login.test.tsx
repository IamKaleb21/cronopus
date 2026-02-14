import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'
import { clearStoredToken, getStoredToken } from '@/lib/auth'

vi.mock('@/services/api', () => ({
    authApi: {
        login: vi.fn(),
        verify: vi.fn(),
    },
}))

import { authApi } from '@/services/api'

const renderLogin = (initialEntry = '/login') => {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <Login />
        </MemoryRouter>
    )
}

beforeEach(() => {
    vi.clearAllMocks()
    clearStoredToken()
})

describe('Login page', () => {
    it('renders title and password input', () => {
        renderLogin()
        expect(screen.getByText('CronOpus')).toBeInTheDocument()
        expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/contraseña maestra/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
    })

    it('on correct password stores token and redirects', async () => {
        const user = userEvent.setup()
        vi.mocked(authApi.login).mockResolvedValue({ token: 'stored-token' })
        renderLogin()

        await user.type(screen.getByLabelText(/contraseña/i), 'dev')
        await user.click(screen.getByRole('button', { name: /entrar/i }))

        await waitFor(() => {
            expect(authApi.login).toHaveBeenCalledWith('dev')
        })
        expect(getStoredToken()).toBe('stored-token')
    })

    it('on wrong password shows error and does not redirect', async () => {
        const user = userEvent.setup()
        vi.mocked(authApi.login).mockRejectedValue(new Error('Unauthorized'))
        renderLogin()

        await user.type(screen.getByLabelText(/contraseña/i), 'wrong')
        await user.click(screen.getByRole('button', { name: /entrar/i }))

        await waitFor(() => {
            expect(screen.getByText(/contraseña incorrecta/i)).toBeInTheDocument()
        })
        expect(authApi.login).toHaveBeenCalledWith('wrong')
    })
})
