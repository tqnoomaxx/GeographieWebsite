import type { ProgressRepository } from './types'
import { LocalRepository } from './localRepository'
import { SupabaseRepository } from './supabaseRepository'
import { authConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/services/auth'

const local = new LocalRepository()
let remote: SupabaseRepository | undefined
let activeUserId: string | null = null
const listeners = new Set<() => void>()

/** Wählt den Adapter: Supabase für eingeloggte Nutzer (Phase 2), sonst lokal. Die UI kennt nur das Interface. */
export function getRepository(): ProgressRepository {
  if (activeUserId && authConfigured) {
    remote ??= new SupabaseRepository(SUPABASE_URL!, SUPABASE_ANON_KEY!)
    return remote
  }
  return local
}

export function getLocalRepository(): LocalRepository {
  return local
}

export function setActiveUser(userId: string | null) {
  if (activeUserId === userId) return
  activeUserId = userId
  for (const l of listeners) l()
}

export function onRepositoryChange(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const isRemoteActive = () => !!activeUserId && authConfigured
