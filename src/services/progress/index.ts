import type { ProgressRepository } from './types'
import { LocalRepository } from './localRepository'

let instance: ProgressRepository | undefined
/** Wählt den Adapter: Supabase, wenn konfiguriert (Phase 2), sonst lokal. Die UI kennt nur das Interface. */
export function getRepository(): ProgressRepository {
  if (!instance) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (url && key) {
      instance = new LocalRepository()
      // Lazy: Supabase-Adapter ersetzt den lokalen, sobald das Modul geladen ist.
      void import('./supabaseRepository').then((m) => {
        instance = new m.SupabaseRepository(url, key)
      })
    } else instance = new LocalRepository()
  }
  return instance
}
