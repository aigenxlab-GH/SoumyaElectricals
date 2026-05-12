import { createContext, useContext, useState, useCallback } from 'react'
import type { User } from '../types/models'

interface AuthTokens {
  access_token: string
  refresh_token: string
}

interface AuthState {
  user: User | null
  tokens: AuthTokens | null
}

interface AuthContextValue extends AuthState {
  setAuth: (user: User, tokens: AuthTokens) => void
  clearAuth: () => void
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuthStore(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthStore must be used within AuthProvider')
  return ctx
}

export function useAuthState(): AuthState & {
  setAuth: (user: User, tokens: AuthTokens) => void
  clearAuth: () => void
} {
  const [state, setState] = useState<AuthState>({ user: null, tokens: null })

  const setAuth = useCallback((user: User, tokens: AuthTokens) => {
    setState({ user, tokens })
  }, [])

  const clearAuth = useCallback(() => {
    setState({ user: null, tokens: null })
  }, [])

  return { ...state, setAuth, clearAuth }
}
