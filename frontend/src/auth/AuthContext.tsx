import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { LoginPayload, RegisterPayload, User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (credentials: LoginPayload) => Promise<User>
  register: (details: RegisterPayload) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (credentials: LoginPayload) => {
    const loggedInUser = await api.login(credentials)
    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const register = useCallback(
    async (details: RegisterPayload) => {
      await api.register(details)
      return login({ username: details.username, password: details.password })
    },
    [login],
  )

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    setUser(await api.me())
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
