import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

export interface AuthContext {
  user: User
  scoped: SupabaseClient
  admin: SupabaseClient
  aal: string
  mfaEnabled: boolean
}

function jwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    if (!payload) return {}
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')))
  } catch {
    return {}
  }
}

/** Validates the bearer token with Auth, then enforces AAL2 for users who enabled MFA. */
export async function authenticate(req: Request): Promise<AuthContext | null> {
  const authorization = req.headers.get('Authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) return null
  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const scoped = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
  const { data, error } = await scoped.auth.getUser()
  if (error || !data.user) return null

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const factors = await admin.auth.admin.mfa.listFactors({ userId: data.user.id })
  if (factors.error) throw factors.error
  const hasMfa = factors.data.factors.some((factor) => factor.status === 'verified')
  const aal = String(jwtPayload(authorization.slice(7)).aal ?? 'aal1')
  if (hasMfa && aal !== 'aal2') return null
  return { user: data.user, scoped, admin, aal, mfaEnabled: hasMfa }
}

export function wasRecentlyAuthenticated(user: User, maxAgeMs = 10 * 60_000) {
  const timestamp = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0
  return Number.isFinite(timestamp) && Date.now() - timestamp <= maxAgeMs
}

export async function rateLimit(admin: SupabaseClient, scope: string, key: string, limit: number, windowSeconds: number) {
  const salt = Deno.env.get('RATE_LIMIT_SALT')
  if (!salt) throw new Error('RATE_LIMIT_SALT is not configured')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${key}`))
  const keyHash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const { data, error } = await admin.rpc('consume_rate_limit', {
    p_scope: scope,
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) throw error
  return data === true
}
