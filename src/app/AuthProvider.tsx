import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, authConfigured, type AuthUser } from '@/services/auth'
import { setActiveUser } from '@/services/progress'

interface AuthState {
  configured: boolean
  loading: boolean
  user: AuthUser | null
  mfaRequired: boolean
  refresh: () => Promise<void>
}
const Ctx = createContext<AuthState>({ configured: false, loading: false, user: null, mfaRequired: false, refresh: async () => undefined })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [loading, setLoading] = useState(authConfigured)
  const refresh = async () => {
    const u = await auth.getUser().catch(() => null)
    const needsMfa = u ? await auth.mfaStatus().then((status) => status.required).catch(() => true) : false
    setUser(u)
    setMfaRequired(needsMfa)
    setActiveUser(u && !needsMfa ? u.id : null)
    setLoading(false)
  }
  useEffect(() => {
    if (!authConfigured) return
    void refresh()
    return auth.onChange((u) => {
      setUser(u)
      setMfaRequired(!!u)
      setActiveUser(null)
      setTimeout(() => void refresh(), 0)
    })
  }, [])
  return <Ctx.Provider value={{ configured: authConfigured, loading, user, mfaRequired, refresh }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
