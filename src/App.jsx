import { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import AuthModal from './components/AuthModal.jsx'
import LandingPage from './components/LandingPage.jsx'
import ChatHome from './pages/ChatHome.jsx'
import './App.css'

function Gate() {
  const { user, loading } = useAuth()
  const [authPhase, setAuthPhase] = useState(null) // null = show landing page

  if (loading) return <div className="nc-boot">Loading…</div>
  if (user) return <ChatHome />
  if (authPhase) return <AuthModal initialPhase={authPhase} onBack={() => setAuthPhase(null)} />
  return <LandingPage onLogin={() => setAuthPhase('login')} onGetStarted={() => setAuthPhase('register')} />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
