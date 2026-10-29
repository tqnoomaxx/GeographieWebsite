// A notebook link is the credential; no account or anonymous Auth user is created.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { acceptsJson, corsHeaders, json, originAllowed } from '../_shared/cors.ts'
import { rateLimit } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (!originAllowed(req)) return json(req, { error: 'origin_not_allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)
  if (!acceptsJson(req)) return json(req, { error: 'unsupported_media_type' }, 415)
  try {
    if (Number(req.headers.get('content-length') ?? 0) > 12_288)
      return json(req, { error: 'payload_too_large' }, 413)
    const reader = req.body?.getReader()
    const decoder = new TextDecoder()
    let raw = ''
    let size = 0
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 12_288) {
          await reader.cancel()
          return json(req, { error: 'payload_too_large' }, 413)
        }
        raw += decoder.decode(value, { stream: true })
      }
      raw += decoder.decode()
    }
    const body = JSON.parse(raw)
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      !['create', 'list', 'save', 'delete', 'destroy'].includes(body.action) ||
      typeof body.notebookId !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.notebookId) ||
      typeof body.secret !== 'string' ||
      !/^[a-f0-9]{64}$/.test(body.secret)
    )
      return json(req, { error: 'invalid_request' }, 400)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const ip = (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'unknown')
      .split(',')[0]
      .trim()
    if (!(await rateLimit(admin, 'quiz-notes-requests', ip, 120, 60)))
      return json(req, { error: 'rate_limited' }, 429)
    if (body.action === 'create' && !(await rateLimit(admin, 'quiz-notes-create', ip, 10, 3600)))
      return json(req, { error: 'rate_limited' }, 429)
    const { data, error } = await admin.rpc('quiz_notes', {
      p_id: body.notebookId,
      p_secret: body.secret,
      p_action: body.action,
      p_note: body.note ?? {},
    })
    if (error) {
      const code = error.message
      if (code === 'notebook_not_found') return json(req, { error: code }, 404)
      if (code === 'note_conflict') return json(req, { error: code }, 409)
      if (code === 'notebook_full') return json(req, { error: code }, 409)
      if (error.code === '22023' || error.code === '22P02') return json(req, { error: 'invalid_note' }, 400)
      return json(req, { error: 'store_unavailable' }, 503)
    }
    const response = json(req, data)
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    return json(
      req,
      { error: error instanceof SyntaxError ? 'invalid_request' : 'store_unavailable' },
      error instanceof SyntaxError ? 400 : 503,
    )
  }
})
