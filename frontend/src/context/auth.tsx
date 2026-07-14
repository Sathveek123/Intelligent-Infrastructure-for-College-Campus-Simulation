import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'

export type UserRole = 'admin' | 'staff'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
}

function normalizeRole(role: unknown): UserRole {
  const r = typeof role === 'string' ? role.toLowerCase() : ''
  return r === 'admin' ? 'admin' : 'staff'
}

function normalizeUser(u: any): AuthUser {
  return {
    id: String(u?.id ?? ''),
    name: String(u?.name ?? ''),
    email: String(u?.email ?? ''),
    role: normalizeRole(u?.role),
  }
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  login: (args: { email: string; password: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const TOKEN_KEY = 'i2sf_token'
const REFRESH_TOKEN_KEY = 'i2sf_refresh_token'
const USER_KEY = 'i2sf_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? normalizeUser(JSON.parse(raw)) : null
  })

  useEffect(() => {
    // Offline/local mode: trust localStorage.
    const t = localStorage.getItem(TOKEN_KEY)
    const raw = localStorage.getItem(USER_KEY)
    if (!t || !raw) return
    try {
      const nextUser = normalizeUser(JSON.parse(raw))
      setToken(t)
      setUser(nextUser)
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      setToken(null)
      setUser(null)
    }
  }, [])

  async function login(args: { email: string; password: string }) {
    try {
      const res = await api.post('/auth/login', args)
      const nextToken = res.data?.token as string | undefined
      const nextRefreshToken = res.data?.refreshToken as string | undefined
      const nextUser = res.data?.user as AuthUser | undefined
      if (!nextToken || !nextUser) throw new Error('Invalid login response')

      const normalized = normalizeUser(nextUser)

      localStorage.setItem(TOKEN_KEY, nextToken)
      if (nextRefreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken)
      localStorage.setItem(USER_KEY, JSON.stringify(normalized))
      setToken(nextToken)
      setUser(normalized)
      return
    } catch {
      const email = args.email.trim().toLowerCase()
      const password = args.password

      const isAdmin = email === 'admin@gmrit.edu.in' && password === 'admin123'
      const isStaff = email === 'staff@gmrit.edu.in' && password === 'staff123'
      if (!isAdmin && !isStaff) throw new Error('Invalid credentials')

      const nextUser: AuthUser = {
        id: isAdmin ? 'u1' : 'u2',
        name: isAdmin ? 'Campus Admin' : 'Staff Member',
        email,
        role: isAdmin ? 'admin' : 'staff',
      }
      const nextToken = `local_${Math.random().toString(16).slice(2, 10)}`
      localStorage.setItem(TOKEN_KEY, nextToken)
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      setToken(nextToken)
      setUser(nextUser)
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  const value = useMemo<AuthContextValue>(() => ({ user, token, login, logout }), [user, token])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
