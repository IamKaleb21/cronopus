import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '@/services/api'
import { setStoredToken } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export default function Login() {
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            const { token } = await authApi.login(password)
            setStoredToken(token)
            navigate(from, { replace: true })
        } catch {
            setError('Contraseña incorrecta')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-background min-h-screen flex items-center justify-center relative overflow-hidden font-body-md text-on-background selection:bg-primary-container selection:text-on-primary-container">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[100px] mix-blend-screen" />
                <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] bg-secondary/10 rounded-full blur-[100px] mix-blend-screen" />
            </div>

            <main className="relative z-10 w-full max-w-[440px] px-[32px]">
                <div className="bg-surface-container/60 backdrop-blur-2xl border border-outline-variant/30 rounded-[24px] shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden">
                    <div className="p-6 flex flex-col gap-8">
                        <header className="flex flex-col items-center text-center gap-4 pt-2">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-white/10 relative">
                                <div className="absolute inset-0 bg-white/5 rounded-2xl" />
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8 text-white" style={{fontVariationSettings: "'FILL' 1"}}>
                                    <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                                </svg>
                            </div>
                            <div className="flex flex-col gap-2">
                                <h1 className="text-2xl font-semibold text-on-surface tracking-tight">CronOpus</h1>
                                <p className="text-base text-on-surface-variant max-w-[280px]">
                                    Ingresa tu contraseña maestra para acceder al centro de comando.
                                </p>
                            </div>
                        </header>

                        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-on-surface-variant px-1" htmlFor="password">
                                    Contraseña
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-on-surface-variant/50 group-focus-within:text-primary transition-colors" style={{fontVariationSettings: "'FILL' 1"}}>
                                            <path fill="currentColor" d="M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                                        </svg>
                                    </div>
                                    <input
                                        className="w-full bg-surface-container-high border border-outline-variant/50 rounded-xl py-3 pl-10 pr-10 text-on-surface font-mono text-sm placeholder:text-on-surface-variant/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all duration-300"
                                        id="password"
                                        name="password"
                                        placeholder="Contraseña maestra"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoFocus
                                        disabled={loading}
                                    />
                                    <button
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-on-surface transition-colors text-on-surface-variant/50"
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" style={{fontVariationSettings: "'FILL' 1"}}>
                                                <path fill="currentColor" d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.94 11.94 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" style={{fontVariationSettings: "'FILL' 1"}}>
                                                <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                <div className="h-5 px-1 flex items-center">
                                    {error && (
                                        <span className="text-xs text-error flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5" style={{fontVariationSettings: "'FILL' 1"}}>
                                                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                            </svg>
                                            {error}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-white text-sm font-medium hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-[0.98] transition-all duration-300 border border-white/10 relative overflow-hidden group disabled:opacity-50"
                                type="submit"
                                disabled={loading}
                            >
                                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
                                <span className="relative z-10 font-bold tracking-wide">
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                    ) : (
                                        'Entrar'
                                    )}
                                </span>
                            </button>
                        </form>
                    </div>

                    <div className="bg-surface-container-high/50 border-t border-outline-variant/30 py-4 px-6 flex justify-center items-center gap-2 text-on-surface-variant/60 font-mono text-[11px] uppercase tracking-wider">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5" style={{fontVariationSettings: "'FILL' 1"}}>
                            <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                        </svg>
                        <span>Sesión protegida. Acceso solo para un usuario.</span>
                    </div>
                </div>
            </main>
        </div>
    )
}
