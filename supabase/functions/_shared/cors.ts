const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export function originAllowed(req: Request) {
  const origin = req.headers.get('Origin')
  return !origin || allowedOrigins.includes(origin)
}

export function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin')
  return {
    ...(origin && allowedOrigins.includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } })
}
