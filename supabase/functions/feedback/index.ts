// Edge Function: Quiz-Vorschläge, Kontakt, Fehlerreports. Serverseitige Validierung, Rate Limiting, Weiterleitung per Mail.
// Secrets (RESEND_API_KEY, ADMIN_EMAIL) liegen ausschließlich in der Function-Umgebung.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { acceptsJson, corsHeaders, json, originAllowed } from '../_shared/cors.ts'
import { rateLimit } from '../_shared/auth.ts'

const LIMIT_PER_HOUR = 5

Deno.serve(async (req) => {
  if (!originAllowed(req)) return json(req, { error: 'origin_not_allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)
  if (!acceptsJson(req)) return json(req, { error: 'unsupported_media_type' }, 415)
  if (Number(req.headers.get('content-length') ?? 0) > 16_384) return json(req, { error: 'payload_too_large' }, 413)

  const body = await req.json().catch(() => null)
  if (!body || !['suggest', 'contact', 'report'].includes(body.kind)) return json(req, { error: 'invalid' }, 400)
  const title = String(body.title ?? '').trim().slice(0, 200)
  if (title.length < 3) return json(req, { error: 'title' }, 400)
  if (body.honeypot) return json(req, { ok: true }) // Spam-Falle: still akzeptieren, nicht speichern
  const email = body.email ? String(body.email).trim().slice(0, 200) : null
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(req, { error: 'email' }, 400)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const ip = (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  if (!(await rateLimit(admin, 'feedback', ip, LIMIT_PER_HOUR, 3600))) return json(req, { error: 'rate_limited' }, 429)

  const authorization = req.headers.get('Authorization') ?? ''
  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
  const { data: me } = await user.auth.getUser()
  const rawPayload = body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload) ? body.payload : {}
  const payload = Object.fromEntries(Object.entries(rawPayload).slice(0, 20).map(([k, v]) => [String(k).slice(0, 40), String(v).slice(0, 4000)]))
  const { error } = await admin.from('suggestions').insert({ user_id: me?.user?.id ?? null, kind: body.kind, title, body: payload, email })
  if (error) return json(req, { error: 'store' }, 500)

  const key = Deno.env.get('RESEND_API_KEY')
  const to = Deno.env.get('ADMIN_EMAIL')
  const sender = Deno.env.get('SENDER_EMAIL')
  if (key && to && sender) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Atlasfunke <${sender}>`, to, subject: `[${body.kind}] ${title}`, text: JSON.stringify(payload, null, 2) }),
    }).catch(() => undefined)
  }
  return json(req, { ok: true })
})
