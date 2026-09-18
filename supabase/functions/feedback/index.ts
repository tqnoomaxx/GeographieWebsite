// Edge Function: Quiz-Vorschläge, Kontakt, Fehlerreports. Serverseitige Validierung, Rate Limiting, Weiterleitung per Mail.
// Secrets (RESEND_API_KEY, ADMIN_EMAIL) liegen ausschließlich in der Function-Umgebung.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const LIMIT_PER_HOUR = 5
const rate = new Map<string, number[]>()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const now = Date.now()
  const hits = (rate.get(ip) ?? []).filter((t) => now - t < 3_600_000)
  if (hits.length >= LIMIT_PER_HOUR) return json({ error: 'rate_limited' }, 429)
  rate.set(ip, [...hits, now])

  const body = await req.json().catch(() => null)
  if (!body || !['suggest', 'contact', 'report'].includes(body.kind)) return json({ error: 'invalid' }, 400)
  const title = String(body.title ?? '').trim().slice(0, 200)
  if (title.length < 3) return json({ error: 'title' }, 400)
  if (body.honeypot) return json({ ok: true }) // Spam-Falle: still akzeptieren, nicht speichern
  const email = body.email ? String(body.email).trim().slice(0, 200) : null
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'email' }, 400)

  const auth = req.headers.get('Authorization') ?? ''
  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: me } = await user.auth.getUser()
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const payload = Object.fromEntries(Object.entries(body.payload ?? {}).map(([k, v]) => [String(k).slice(0, 40), String(v).slice(0, 4000)]))
  const { error } = await admin.from('suggestions').insert({ user_id: me?.user?.id ?? null, kind: body.kind, title, body: payload, email })
  if (error) return json({ error: 'store' }, 500)

  const key = Deno.env.get('RESEND_API_KEY')
  const to = Deno.env.get('ADMIN_EMAIL')
  if (key && to) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'GeoKompass <noreply@geokompass.app>', to, subject: `[${body.kind}] ${title}`, text: JSON.stringify(payload, null, 2) }),
    }).catch(() => undefined)
  }
  return json({ ok: true })
})
