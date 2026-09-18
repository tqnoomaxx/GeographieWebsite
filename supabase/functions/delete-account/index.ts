// Edge Function: echte Account-Löschung (Auth-User + alle Nutzerdaten via ON DELETE CASCADE) und Session-Invalidierung.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const auth = req.headers.get('Authorization') ?? ''
  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: me } = await user.auth.getUser()
  if (!me?.user) return json({ error: 'unauthorized' }, 401)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  // Vorschläge anonymisieren statt löschen (user_id → null durch FK), alles andere kaskadiert.
  const { error } = await admin.auth.admin.deleteUser(me.user.id)
  if (error) return json({ error: error.message }, 500)
  return json({ ok: true })
})
