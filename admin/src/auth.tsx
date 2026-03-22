import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import api, { unwrap } from './services/api'

type User = { id: number; username: string; roles: string[] }

type AuthState = {
  token: string | null
  user: User | null
  permissions: string[]
  login: (u: string, p: string) => Promise<void>
  logout: () => void
  hasPerm: (p: string) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    try {
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  })
  const [permissions, setPermissions] = useState<string[]>(() => {
    const raw = localStorage.getItem('permissions')
    if (!raw) return []
    try {
      return JSON.parse(raw) as string[]
    } catch {
      return []
    }
  })

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post('/api/v1/auth/login', { username, password })
    const data = unwrap<{
      token: string
      permissions: string[]
      user: User
    }>(res)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    localStorage.setItem('permissions', JSON.stringify(data.permissions))
    setToken(data.token)
    setUser(data.user)
    setPermissions(data.permissions)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('permissions')
    setToken(null)
    setUser(null)
    setPermissions([])
  }, [])

  const hasPerm = useCallback((p: string) => permissions.includes(p), [permissions])

  const value = useMemo(
    () => ({ token, user, permissions, login, logout, hasPerm }),
    [token, user, permissions, login, logout, hasPerm]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
