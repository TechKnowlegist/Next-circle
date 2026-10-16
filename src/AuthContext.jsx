import { createContext, useContext, useState, useEffect } from 'react'
import {
  getCurrentUser,
  fetchUserAttributes,
  signIn,
  signUp,
  confirmSignUp,
  signOut,
  updateUserAttributes,
} from 'aws-amplify/auth'

const AuthContext = createContext(null)

// Shown everywhere instead of a raw email — reuses whatever username the
// user already set on the main Nextlayer3D site (preferred_username is a
// real Cognito attribute, shared across every site on this user pool).
// Deliberately does NOT fall back to any part of the email — someone's
// email is never shown publicly anywhere in Next Circle, set a username
// or not.
export function displayNameFor(attrs) {
  if (!attrs) return 'Anonymous'
  if (attrs.preferred_username) return attrs.preferred_username
  return 'Anonymous'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const current = await getCurrentUser()
      const attrs = await fetchUserAttributes()
      setUser({ id: current.userId, email: attrs.email || null, name: displayNameFor(attrs) })
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    try {
      await signIn({ username: email, password })
      await load()
      return { success: true }
    } catch (err) {
      console.log('Next Circle — sign in failed:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Sign in failed' }
    }
  }

  async function register(email, password) {
    try {
      const { nextStep } = await signUp({
        username: email,
        password,
        options: { userAttributes: { email } },
      })
      return { success: true, needsConfirmation: nextStep.signUpStep === 'CONFIRM_SIGN_UP' }
    } catch (err) {
      console.log('Next Circle — sign up failed:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Sign up failed' }
    }
  }

  async function confirmRegistration(email, code, password) {
    try {
      await confirmSignUp({ username: email, confirmationCode: code })
      await signIn({ username: email, password })
      await load()
      return { success: true }
    } catch (err) {
      console.log('Next Circle — confirmation failed:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Confirmation failed' }
    }
  }

  async function logout() {
    try {
      await signOut()
    } catch (err) {
      console.log('Next Circle — sign out failed:', err)
    }
    setUser(null)
  }

  // Updates the shared preferred_username attribute (not a Next-Circle-only
  // field — see the comment on ChatUserProfile in amplify/data/resource.ts
  // for why), then reloads so `user.name` reflects it immediately.
  // Passing an empty string clears it back to no username set.
  async function updateUsername(newUsername) {
    try {
      await updateUserAttributes({
        userAttributes: { preferred_username: newUsername },
      })
      await load()
      return { success: true }
    } catch (err) {
      console.log('Next Circle — updating username failed:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Could not update username' }
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, confirmRegistration, logout, updateUsername }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
