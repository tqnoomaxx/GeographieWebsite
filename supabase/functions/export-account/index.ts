import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { acceptsJson, corsHeaders, json, originAllowed } from '../_shared/cors.ts'
import { authenticate, rateLimit } from '../_shared/auth.ts'

const TABLES = [
  'profiles',
  'user_settings',
  'user_stats',
  'user_progress',
  'quiz_sessions',
  'user_achievements',
  'user_quests',
  'favorites',
  'puzzle_results',
  'suggestions',
] as const

async function readAll(table: typeof TABLES[number], ownerColumn: string, userId: string, scoped: SupabaseClient) {
  const rows: unknown[] = []
  for (let start = 0; ; start += 1000) {
    const { data, error } = await scoped.from(table).select('*').eq(ownerColumn, userId).range(start, start + 999)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) return rows
  }
}

Deno.serve(async (req) => {
  if (!originAllowed(req)) return json(req, { error: 'origin_not_allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)
  if (!acceptsJson(req)) return json(req, { error: 'unsupported_media_type' }, 415)

  try {
    const auth = await authenticate(req)
    if (!auth) return json(req, { error: 'unauthorized' }, 401)
    if (!(await rateLimit(auth.admin, 'account-export', auth.user.id, 5, 3600))) return json(req, { error: 'rate_limited' }, 429)

    const entries = await Promise.all(TABLES.map(async (table) => {
      const ownerColumn = table === 'profiles' ? 'id' : 'user_id'
      return [table, await readAll(table, ownerColumn, auth.user.id, auth.scoped)] as const
    }))

    return json(req, {
      format: 'atlasfunke-account-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      account: {
        id: auth.user.id,
        email: auth.user.email,
        createdAt: auth.user.created_at,
        lastSignInAt: auth.user.last_sign_in_at,
        mfaEnabled: auth.mfaEnabled,
      },
      data: Object.fromEntries(entries),
    })
  } catch (error) {
    console.error('account export failed', error instanceof Error ? error.message : 'unknown')
    return json(req, { error: 'export_failed' }, 500)
  }
})
