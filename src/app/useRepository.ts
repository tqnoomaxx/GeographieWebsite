import { useSyncExternalStore } from 'react'
import { getRepository, getLocalRepository, onRepositoryChange } from '@/services/progress'
import { useAuth } from './AuthProvider'

/** Data consumers reload together when the verified account changes. */
export function useRepository() {
  return useSyncExternalStore(onRepositoryChange, getRepository, getLocalRepository)
}

export function useAccountScope() {
  const { user, mfaRequired } = useAuth()
  return user && !mfaRequired ? user.id : 'guest'
}
