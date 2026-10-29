import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from '@/app/AuthProvider'
import { useAsync } from '@/app/hooks'
import { improvements } from '@/services/improvements'

const Context = createContext({
  allowed: false,
  loading: false,
  error: undefined as Error | undefined,
  retry: () => {},
})

export function DeveloperAccessProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const id = !auth.loading && !auth.mfaRequired ? auth.user?.id : undefined
  const check = useAsync(async () => ({ id, allowed: id ? await improvements.hasAccess(id) : false }), [id])
  const value = {
    allowed: !!id && !check.loading && !check.error && check.data?.id === id && check.data.allowed,
    loading: auth.loading || (!!id && check.loading),
    error: id ? check.error : undefined,
    retry: check.reload,
  }
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export const useDeveloperAccess = () => useContext(Context)
