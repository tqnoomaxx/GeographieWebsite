import type { AuthUser, AuthListener, MfaStatus } from '@/services/auth'

export interface AuthSnapshot {
  loading: boolean
  user: AuthUser | null
  mfaRequired: boolean
  error?: Error
}
interface AuthAdapter {
  getUser(): Promise<AuthUser | null>
  mfaStatus(): Promise<MfaStatus>
  onChange(listener: AuthListener): () => void
}

/** One verified identity, one refresh at a time. Auth events never switch a known user to guest. */
export function createAuthSession(
  adapter: AuthAdapter,
  configured: boolean,
  activate: (id: string | null) => void,
) {
  let state: AuthSnapshot = { loading: configured, user: null, mfaRequired: false }
  let active = false,
    generation = 0
  let expectedId: string | null | undefined
  let running: Promise<void> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()
  function publish(next: AuthSnapshot) {
    state = next
    activate(next.user && !next.mfaRequired ? next.user.id : null)
    listeners.forEach((listener) => listener())
  }
  function invalidate() {
    generation++
    running = undefined
    clearTimeout(timer)
  }
  function refresh(): Promise<void> {
    if (!configured || !active) return Promise.resolve()
    if (running) return running
    const ticket = generation
    const request = (async () => {
      try {
        const user = await adapter.getUser()
        if (!active || ticket !== generation) return
        const mfaRequired = user ? (await adapter.mfaStatus()).required : false
        if (!active || ticket !== generation) return
        const stableUser =
          user && state.user && JSON.stringify(user) === JSON.stringify(state.user) ? state.user : user
        expectedId = user?.id ?? null
        publish({ user: stableUser, mfaRequired, loading: false })
      } catch {
        if (!active || ticket !== generation) return
        publish({
          ...state,
          loading: false,
          error: new Error(
            'Die Sitzung konnte gerade nicht geprüft werden. Bitte die Verbindung prüfen und erneut versuchen.',
          ),
        })
      }
    })().finally(() => {
      if (running === request) running = undefined
    })
    running = request
    return request
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    refresh,
    start() {
      if (!configured) return () => {}
      active = true
      const unsubscribe = adapter.onChange((user, event) => {
        if (!active) return
        if (['MFA_CHALLENGE_VERIFIED', 'USER_UPDATED', 'PASSWORD_RECOVERY'].includes(event)) invalidate()
        if (event === 'SIGNED_OUT' || (!user && event === 'INITIAL_SESSION')) {
          invalidate()
          expectedId = null
          publish({ user: null, loading: false, mfaRequired: false })
          return
        }
        if (user && expectedId !== undefined && expectedId !== user.id) {
          invalidate()
          publish({ user: null, loading: true, mfaRequired: false })
        }
        if (user) expectedId = user.id
        clearTimeout(timer)
        // Supabase invokes listeners under its session lock. Never call Auth APIs inside it.
        timer = setTimeout(() => {
          void refresh()
        }, 0)
      })
      void refresh()
      return () => {
        active = false
        invalidate()
        unsubscribe()
      }
    },
  }
}
