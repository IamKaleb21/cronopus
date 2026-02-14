import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getStoredToken, clearStoredToken } from '@/lib/auth'
import { authApi } from '@/services/api'

export function AuthGuard() {
    const [checking, setChecking] = useState(!!getStoredToken())
    const [valid, setValid] = useState(false)
    const location = useLocation()

    useEffect(() => {
        const token = getStoredToken()
        if (!token) {
            setChecking(false)
            return
        }
        authApi
            .verify()
            .then(() => setValid(true))
            .catch(() => {
                clearStoredToken()
                setValid(false)
            })
            .finally(() => setChecking(false))
    }, [])

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Verificando...</div>
            </div>
        )
    }

    const token = getStoredToken()
    if (!token || !valid) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    return <Outlet />
}
