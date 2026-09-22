// Irreversible account deletion. Requires a freshly authenticated, MFA-complete session and explicit confirmation.
import { acceptsJson, corsHeaders, json, originAllowed } from '../_shared/cors.ts'
import { authenticate, rateLimit, wasRecentlyAuthenticated } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (!originAllowed(req)) return json(req, { error: 'origin_not_allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)
  if (!acceptsJson(req)) return json(req, { error: 'unsupported_media_type' }, 415)
  if (Number(req.headers.get('content-length') ?? 0) > 2048) return json(req, { error: 'payload_too_large' }, 413)

  try {
    const auth = await authenticate(req)
    if (!auth) return json(req, { error: 'unauthorized' }, 401)
    if (!(await rateLimit(auth.admin, 'account-delete', auth.user.id, 5, 3600))) return json(req, { error: 'rate_limited' }, 429)

    const body = await req.json().catch(() => null)
    const emailMatches = typeof body?.confirmEmail === 'string' && body.confirmEmail.trim().toLowerCase() === auth.user.email?.toLowerCase()
    if (body?.confirmation !== 'DELETE' || !emailMatches) return json(req, { error: 'confirmation_failed' }, 400)
    if (!wasRecentlyAuthenticated(auth.user)) return json(req, { error: 'reauthentication_required' }, 403)

    // Optional feedback can also contain an email address, so linked submissions are deleted rather than merely anonymized.
    const { error: feedbackError } = await auth.admin.from('suggestions').delete().eq('user_id', auth.user.id)
    if (feedbackError) throw feedbackError
    // All remaining private account rows cascade from auth.users.
    const { error } = await auth.admin.auth.admin.deleteUser(auth.user.id, false)
    if (error) throw error
    return json(req, { ok: true })
  } catch (error) {
    console.error('account deletion failed', error instanceof Error ? error.message : 'unknown')
    return json(req, { error: 'delete_failed' }, 500)
  }
})
