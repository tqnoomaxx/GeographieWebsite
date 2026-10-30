import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { auth, authConfigured } from '@/services/auth'
import { setActiveUser } from '@/services/progress'
import { createAuthSession, type AuthSnapshot } from './authSession'

interface AuthState extends AuthSnapshot {
  configured: boolean
  refresh: () => Promise<void>
}
const Ctx = createContext<AuthState>({
  configured: false,
  loading: false,
  user: null,
  mfaRequired: false,
  refresh: async () => undefined,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useMemo(() => createAuthSession(auth, authConfigured, setActiveUser), [])
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
  useEffect(() => session.start(), [session])
  useEffect(() => {
    const retry = () => {
      void session.refresh()
    }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [session])
  return (
    <Ctx.Provider value={{ ...state, configured: authConfigured, refresh: session.refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
