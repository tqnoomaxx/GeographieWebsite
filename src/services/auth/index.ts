import type { SupabaseClient, Session, User } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const authConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

export interface AuthUser {
  id: string
  email?: string
  emailConfirmed: boolean
  createdAt: string
}

export type AuthListener = (user: AuthUser | null) => void

let clientPromise: Promise<SupabaseClient> | null = null
/** Supabase-Client, lazy geladen, damit die statische App ohne Backend klein bleibt. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!authConfigured) return Promise.reject(new Error('Supabase ist nicht konfiguriert (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).'))
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then((m) =>
      m.createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }),
    )
  }
  return clientPromise
}

const toUser = (u: User | null | undefined): AuthUser | null =>
  u ? { id: u.id, email: u.email ?? undefined, emailConfirmed: !!u.email_confirmed_at, createdAt: u.created_at } : null

export const redirectTo = () => `${location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/account`

export const auth = {
  async getUser(): Promise<AuthUser | null> {
    if (!authConfigured) return null
    const c = await getSupabase()
    const { data } = await c.auth.getSession()
    return toUser(data.session?.user)
  },
  async getSession(): Promise<Session | null> {
    if (!authConfigured) return null
    return (await (await getSupabase()).auth.getSession()).data.session
  },
  onChange(listener: AuthListener): () => void {
    if (!authConfigured) return () => undefined
    let unsub = () => undefined as void
    void getSupabase().then((c) => {
      const { data } = c.auth.onAuthStateChange((_e, session) => listener(toUser(session?.user)))
      unsub = () => data.subscription.unsubscribe()
    })
    return () => unsub()
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
    const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } })
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
  async signOut() {
    const c = await getSupabase()
    await c.auth.signOut()
  },
  /** Echte Löschung über Edge Function (Service Role), danach lokale Session beenden. */
  async deleteAccount() {
    const c = await getSupabase()
    const { error } = await c.functions.invoke('delete-account', { body: {} })
    if (error) throw error
    await c.auth.signOut()
  },
}

/** Übersetzt Supabase-Fehlermeldungen in verständliche deutsche Hinweise. */
export function authErrorMessage(e: unknown): string {
  const m = (e as { message?: string })?.message ?? ''
  if (/invalid login credentials/i.test(m)) return 'E-Mail oder Passwort ist falsch.'
  if (/email not confirmed/i.test(m)) return 'Bitte bestätige zuerst deine E-Mail-Adresse.'
  if (/password should be at least/i.test(m)) return 'Das Passwort muss mindestens 8 Zeichen haben.'
  if (/user already registered/i.test(m)) return 'Für diese E-Mail gibt es schon ein Konto. Melde dich an.'
  if (/rate limit|too many/i.test(m)) return 'Zu viele Versuche. Bitte warte kurz.'
  if (/not configured/i.test(m)) return m
  return 'Das hat nicht geklappt. Bitte versuche es erneut.'
}
