import type { Factor, SupabaseClient, Session, User } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const authConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

export interface AuthUser {
  id: string
  email?: string
  emailConfirmed: boolean
  createdAt: string
  lastSignInAt?: string
}

export interface MfaStatus {
  currentLevel: string | null
  nextLevel: string | null
  factors: Factor<'totp', 'verified'>[]
  required: boolean
}

export interface MfaEnrollment {
  factorId: string
  qrCode: string
  secret: string
}

export type AuthListener = (user: AuthUser | null) => void

let clientPromise: Promise<SupabaseClient> | null = null
const PERSISTENCE_KEY = 'gk.auth.remember'
const STORAGE_KEY = 'atlasfunke.auth.session'

const remembersSession = () => localStorage.getItem(PERSISTENCE_KEY) === 'true'
const selectedStorage = () => (remembersSession() ? localStorage : sessionStorage)
const otherStorage = () => (remembersSession() ? sessionStorage : localStorage)
const authStorage = {
  getItem(key: string) {
    return selectedStorage().getItem(key) ?? otherStorage().getItem(key)
  },
  setItem(key: string, value: string) {
    selectedStorage().setItem(key, value)
    otherStorage().removeItem(key)
  },
  removeItem(key: string) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

function migrateLegacySession() {
  if (!SUPABASE_URL || authStorage.getItem(STORAGE_KEY)) return
  try {
    const ref = new URL(SUPABASE_URL).hostname.split('.')[0]
    const legacyKey = `sb-${ref}-auth-token`
    const legacy = localStorage.getItem(legacyKey) ?? sessionStorage.getItem(legacyKey)
    if (legacy) authStorage.setItem(STORAGE_KEY, legacy)
    localStorage.removeItem(legacyKey)
    sessionStorage.removeItem(legacyKey)
  } catch {
    // Invalid URLs are rejected by createClient below; no legacy migration needed.
  }
}

/** Supabase-Client, lazy geladen, damit die statische App ohne Backend klein bleibt. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!authConfigured) return Promise.reject(new Error('Supabase ist nicht konfiguriert (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).'))
  if (!clientPromise) {
    migrateLegacySession()
    clientPromise = import('@supabase/supabase-js').then((m) =>
      m.createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storage: authStorage,
          storageKey: STORAGE_KEY,
        },
      }),
    )
  }
  return clientPromise
}

const toUser = (u: User | null | undefined): AuthUser | null =>
  u
    ? {
        id: u.id,
        email: u.email ?? undefined,
        emailConfirmed: !!u.email_confirmed_at,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
      }
    : null

async function throwFunctionError(error: unknown): Promise<never> {
  const context = (error as { context?: unknown })?.context
  if (context instanceof Response) {
    const body = await context.clone().json().catch(() => null) as { error?: string } | null
    if (body?.error) throw new Error(body.error)
  }
  throw error
}

export const redirectTo = () => `${location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/account`

export const auth = {
  async getUser(): Promise<AuthUser | null> {
    if (!authConfigured) return null
    const c = await getSupabase()
    const { data, error } = await c.auth.getUser()
    if (error) return null
    return toUser(data.user)
  },
  async getSession(): Promise<Session | null> {
    if (!authConfigured) return null
    return (await (await getSupabase()).auth.getSession()).data.session
  },
  onChange(listener: AuthListener): () => void {
    if (!authConfigured) return () => undefined
    let unsub = () => undefined as void
    let cancelled = false
    void getSupabase().then((c) => {
      const { data } = c.auth.onAuthStateChange((_e, session) => listener(toUser(session?.user)))
      unsub = () => data.subscription.unsubscribe()
      if (cancelled) unsub()
    })
    return () => {
      cancelled = true
      unsub()
    }
  },
  async signUp(email: string, password: string) {
    const c = await getSupabase()
    const { data, error } = await c.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } })
    if (error) throw error
    return { user: toUser(data.user), needsConfirmation: !data.session }
  },
  async signIn(email: string, password: string) {
    const c = await getSupabase()
    const { data, error } = await c.auth.signInWithPassword({ email, password })
    if (error) throw error
    return toUser(data.user)
  },
  async signInWithMagicLink(email: string) {
    const c = await getSupabase()
    const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo(), shouldCreateUser: false } })
    if (error) throw error
  },
  async resetPassword(email: string) {
    const c = await getSupabase()
    const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/passwort` })
    if (error) throw error
  },
  async updatePassword(password: string) {
    const c = await getSupabase()
    const { error } = await c.auth.updateUser({ password })
    if (error) throw error
  },
  setPersistence(remember: boolean) {
    const value = authStorage.getItem(STORAGE_KEY)
    localStorage.setItem(PERSISTENCE_KEY, String(remember))
    if (value) authStorage.setItem(STORAGE_KEY, value)
  },
  remembersSession,
  async mfaStatus(): Promise<MfaStatus> {
    const c = await getSupabase()
    const [aal, listed] = await Promise.all([c.auth.mfa.getAuthenticatorAssuranceLevel(), c.auth.mfa.listFactors()])
    if (aal.error) throw aal.error
    if (listed.error) throw listed.error
    const factors = listed.data.totp
    return {
      currentLevel: aal.data.currentLevel,
      nextLevel: aal.data.nextLevel,
      factors,
      required: aal.data.currentLevel === 'aal1' && aal.data.nextLevel === 'aal2',
    }
  },
  async enrollMfa(): Promise<MfaEnrollment> {
    const c = await getSupabase()
    const listed = await c.auth.mfa.listFactors()
    if (listed.error) throw listed.error
    for (const factor of listed.data.all.filter((f) => f.factor_type === 'totp' && f.status === 'unverified')) {
      await c.auth.mfa.unenroll({ factorId: factor.id })
    }
    const { data, error } = await c.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Atlasfunke Authenticator' })
    if (error) throw error
    const qrCode = data.totp.qr_code.startsWith('data:') ? data.totp.qr_code : `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(data.totp.qr_code)}`
    return { factorId: data.id, qrCode, secret: data.totp.secret }
  },
  async verifyMfa(factorId: string, code: string) {
    const c = await getSupabase()
    const { error } = await c.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) throw error
  },
  async unenrollMfa(factorId: string) {
    const c = await getSupabase()
    const { error } = await c.auth.mfa.unenroll({ factorId })
    if (error) throw error
    await c.auth.refreshSession()
  },
  async exportAccount(): Promise<Record<string, unknown>> {
    const c = await getSupabase()
    const { data, error } = await c.functions.invoke('export-account', { body: {} })
    if (error) return throwFunctionError(error)
    return data as Record<string, unknown>
  },
  async signOut(allDevices = false) {
    const c = await getSupabase()
    const { error } = await c.auth.signOut({ scope: allDevices ? 'global' : 'local' })
    if (error) throw error
  },
  /** Echte Löschung über Edge Function (Service Role), danach lokale Session beenden. */
  async deleteAccount(confirmEmail: string) {
    const c = await getSupabase()
    const { error } = await c.functions.invoke('delete-account', { body: { confirmation: 'DELETE', confirmEmail } })
    if (error) await throwFunctionError(error)
    await c.auth.signOut({ scope: 'local' })
  },
}

/** Übersetzt Supabase-Fehlermeldungen in verständliche deutsche Hinweise. */
export function authErrorMessage(e: unknown): string {
  const m = (e as { message?: string })?.message ?? ''
  if (/invalid login credentials|user not found/i.test(m)) return 'Die Anmeldung konnte mit diesen Daten nicht abgeschlossen werden.'
  if (/email not confirmed/i.test(m)) return 'Bitte bestätige zuerst deine E-Mail-Adresse.'
  if (/password should be at least|password.*weak|password.*character/i.test(m)) return 'Das Passwort erfüllt die Sicherheitsanforderungen noch nicht.'
  if (/user already registered/i.test(m)) return 'Wenn die Adresse verwendet werden kann, erhältst du gleich eine E-Mail.'
  if (/mfa|factor|challenge|verification code/i.test(m)) return 'Der Sicherheitscode ist ungültig oder abgelaufen.'
  if (/reauthentication_required/i.test(m)) return 'Bitte melde dich aus Sicherheitsgründen neu an und versuche es innerhalb von zehn Minuten erneut.'
  if (/confirmation_failed/i.test(m)) return 'Die Sicherheitsbestätigung stimmt nicht.'
  if (/rate limit|too many/i.test(m)) return 'Zu viele Versuche. Bitte warte kurz.'
  if (/not configured/i.test(m)) return m
  return 'Das hat nicht geklappt. Bitte versuche es erneut.'
}

export { isStrongPassword, passwordChecks, PASSWORD_MIN_LENGTH, safeNextPath } from './password'
