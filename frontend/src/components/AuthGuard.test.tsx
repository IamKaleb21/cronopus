import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from './AuthGuard'
import { setStoredToken, clearStoredToken } from '@/lib/auth'

vi.mock('@/services/api', () => ({
    authApi: {
        login: vi.fn(),
        verify: vi.fn(),
    },
}))

import { authApi } from '@/services/api'

function TestApp({ initialEntry = '/' }: { initialEntry?: string }) {
    return (
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route path="/" element={<AuthGuard />}>
                    <Route index element={<div>Protected content</div>} />
                </Route>
                <Route path="/login" element={<div>Login page</div>} />
            </Routes>
        </MemoryRouter>
    )
}

beforeEach(() => {
    vi.clearAllMocks()
    clearStoredToken()
})

describe('AuthGuard', () => {
    it('redirects to /login when there is no token', async () => {
        render(<TestApp />)
        await waitFor(() => {
            expect(screen.getByText(/login page/i)).toBeInTheDocument()
        })
        expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument()
    })

    it('redirects to /login when verify fails', async () => {
        setStoredToken('bad-token')
        vi.mocked(authApi.verify).mockRejectedValue(new Error('Unauthorized'))
        render(<TestApp />)

        await waitFor(() => {
            expect(screen.getByText(/login page/i)).toBeInTheDocument()
        })
        expect(authApi.verify).toHaveBeenCalled()
    })

    it('renders children when token is valid', async () => {
        setStoredToken('valid-token')
        vi.mocked(authApi.verify).mockResolvedValue({ valid: true })
        render(<TestApp />)

        await waitFor(() => {
            expect(screen.getByText(/protected content/i)).toBeInTheDocument()
        })
        expect(authApi.verify).toHaveBeenCalled()
    })
})
