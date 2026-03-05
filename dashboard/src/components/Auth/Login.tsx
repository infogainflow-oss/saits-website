import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import './Login.css'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<'login' | 'forgot'>('login')
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const { signIn, resetPassword } = useAuth()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const { error } = await signIn(email, password)

        if (error) {
            setMessage({ type: 'error', text: error.message })
        }

        setLoading(false)
    }

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const { error } = await resetPassword(email)

        if (error) {
            setMessage({ type: 'error', text: error.message })
        } else {
            setMessage({
                type: 'success',
                text: 'Password reset email sent! Check your inbox.',
            })
        }

        setLoading(false)
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>SAITS Client Portal</h1>
                    <p>
                        {mode === 'login' && 'Sign in to access your dashboard'}
                        {mode === 'forgot' && 'Reset your password'}
                    </p>
                </div>

                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <button type="submit" disabled={loading} className="login-button">
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>

                        <div className="auth-links">
                            <button
                                type="button"
                                onClick={() => setMode('forgot')}
                                className="link-button"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </form>
                )}

                {mode === 'forgot' && (
                    <form onSubmit={handleForgotPassword} className="login-form">
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <button type="submit" disabled={loading} className="login-button">
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>

                        <div className="auth-links">
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="link-button"
                            >
                                Back to login
                            </button>
                        </div>
                    </form>
                )}

                {message && (
                    <div className={`message ${message.type}`}>
                        {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                    </div>
                )}
            </div>
        </div>
    )
}
