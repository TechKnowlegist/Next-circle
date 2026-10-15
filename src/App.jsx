import { AuthProvider, useAuth } from './AuthContext.jsx'
import AuthModal from './components/AuthModal.jsx'
import ChatHome from './pages/ChatHome.jsx'
import './App.css'

function Gate() {
  const { user, loading } = useAuth()
  if (loading) return <div className="nc-boot">Loading…</div>
  return user ? <ChatHome /> : <AuthModal />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
