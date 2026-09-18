import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, authConfigured, type AuthUser } from '@/services/auth'
import { setActiveUser } from '@/services/progress'

interface AuthState {
  configured: boolean
  loading: boolean
  user: AuthUser | null
  refresh: () => Promise<void>
}
const Ctx = createContext<AuthState>({ configured: false, loading: false, user: null, refresh: async () => undefined })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(authConfigured)
  const refresh = async () => {
    const u = await auth.getUser().catch(() => null)
    setUser(u)
    setActiveUser(u?.id ?? null)
    setLoading(false)
  }
  useEffect(() => {
    if (!authConfigured) return
    void refresh()
    return auth.onChange((u) => {
      setUser(u)
      setActiveUser(u?.id ?? null)
    })
  }, [])
  return <Ctx.Provider value={{ configured: authConfigured, loading, user, refresh }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
