// Edge Function: echte Account-Löschung (Auth-User + alle Nutzerdaten via ON DELETE CASCADE) und Session-Invalidierung.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json, originAllowed } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (!originAllowed(req)) return json(req, { error: 'origin_not_allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)
  const auth = req.headers.get('Authorization') ?? ''
  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: me } = await user.auth.getUser()
  if (!me?.user) return json(req, { error: 'unauthorized' }, 401)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  // Vorschläge anonymisieren statt löschen (user_id → null durch FK), alles andere kaskadiert.
  const { error } = await admin.auth.admin.deleteUser(me.user.id)
  if (error) return json(req, { error: error.message }, 500)
  return json(req, { ok: true })
})
