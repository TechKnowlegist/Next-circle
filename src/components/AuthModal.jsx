import { useState } from 'react'
import { useAuth } from '../AuthContext.jsx'

// Sign in / sign up / confirm — one modal, three phases. Same Cognito pool
// as the main Nextlayer3D site, so a Nextlayer3D account logs in here too;
// see amplifyConfig.js.
export default function AuthModal() {
  const { login, register, confirmRegistration } = useAuth()
  const [phase, setPhase] = useState('login') // 'login' | 'register' | 'confirm'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await login(email, password)
    setBusy(false)
    if (!res.success) setError(res.error)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await register(email, password)
    setBusy(false)
    if (!res.success) {
      setError(res.error)
      return
    }
    setPhase(res.needsConfirmation ? 'confirm' : 'login')
  }

  async function handleConfirm(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await confirmRegistration(email, code, password)
    setBusy(false)
    if (!res.success) setError(res.error)
  }

  return (
    <div className="nc-auth-screen">
      <div className="nc-auth-card">
        <h1>Next Circle</h1>
        <p className="nc-auth-sub">Same account as nextlayer3d.app — sign in with it below.</p>

        {phase === 'login' && (
          <form onSubmit={handleLogin} className="nc-auth-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="nc-auth-error">{error}</p>}
            <button type="submit" className="nc-btn nc-btn-primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
            <button type="button" className="nc-btn nc-btn-text" onClick={() => setPhase('register')}>
              Need an account? Sign up
            </button>
          </form>
        )}

        {phase === 'register' && (
          <form onSubmit={handleRegister} className="nc-auth-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="nc-auth-error">{error}</p>}
            <button type="submit" className="nc-btn nc-btn-primary" disabled={busy}>
              {busy ? 'Creating account…' : 'Sign Up'}
            </button>
            <button type="button" className="nc-btn nc-btn-text" onClick={() => setPhase('login')}>
              Already have an account? Sign in
            </button>
          </form>
        )}

        {phase === 'confirm' && (
          <form onSubmit={handleConfirm} className="nc-auth-form">
            <p className="nc-auth-sub">Check {email} for a confirmation code.</p>
            <input
              type="text"
              placeholder="Confirmation code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            {error && <p className="nc-auth-error">{error}</p>}
            <button type="submit" className="nc-btn nc-btn-primary" disabled={busy}>
              {busy ? 'Confirming…' : 'Confirm & Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
