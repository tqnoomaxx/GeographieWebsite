// Edge Function: nimmt eine Quiz-Session entgegen, prüft Plausibilität und berechnet XP/Fortschritt serverseitig.
// Der Client darf XP, Achievements und Quests niemals selbst setzen (Anti-Cheat, TASK.md §99).
import { acceptsJson, corsHeaders, json, originAllowed } from '../_shared/cors.ts'
import { authenticate, rateLimit } from '../_shared/auth.ts'

const XP = { correct: 10, wrong: 2, bonus: { 1: 0, 2: 5, 3: 10 } as Record<number, number>, completed: 25, full: 100, achievement: 100 }
const MAX_QUESTIONS_PER_SESSION = 500
const MIN_MS_PER_ANSWER = 250
const CATEGORIES = new Set(['flags', 'countries', 'capitals', 'regions', 'cities', 'maps', 'landmarks', 'images', 'license_plates', 'water', 'nature', 'mixed'])

Deno.serve(async (req) => {
  if (!originAllowed(req)) return json(req, { error: 'origin_not_allowed' }, 403)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)
  if (!acceptsJson(req)) return json(req, { error: 'unsupported_media_type' }, 415)
  if (Number(req.headers.get('content-length') ?? 0) > 524_288) return json(req, { error: 'payload_too_large' }, 413)
  const context = await authenticate(req).catch(() => null)
  if (!context) return json(req, { error: 'unauthorized' }, 401)
  const { user: me, admin } = context
  if (!(await rateLimit(admin, 'submit-session', me.id, 120, 3600).catch(() => false))) return json(req, { error: 'rate_limited' }, 429)

  const session = await req.json().catch(() => null)
  if (
    !session || typeof session.id !== 'string' || !session.id.length || session.id.length > 128 ||
    typeof session.category !== 'string' || !CATEGORIES.has(session.category) ||
    typeof session.scope !== 'string' || !session.scope.length || session.scope.length > 80 ||
    !['standard', 'full', 'repeat_errors'].includes(session.mode) ||
    typeof session.seed !== 'string' || session.seed.length > 128 ||
    !Array.isArray(session.questions) || !session.questions.length || session.questions.length > MAX_QUESTIONS_PER_SESSION
  ) return json(req, { error: 'invalid' }, 400)
  if (session.questions.some((q: unknown) => {
    const item = q as Record<string, unknown>
    const question = item.question as Record<string, unknown> | undefined
    return !question || typeof question.id !== 'string' || question.id.length > 160 || ![1, 2, 3].includes(question.difficulty as number) || !Array.isArray(question.entities) || question.entities.length > 8
  })) return json(req, { error: 'invalid_question' }, 400)
  const { data: existing } = await admin.from('quiz_sessions').select('id, validated').eq('id', session.id).maybeSingle()
  if (existing?.validated) return json(req, { error: 'already_processed' }, 409)

  // Plausibilität: Antwortzeiten, Reihenfolge, keine doppelten Fragen
  const seen = new Set<string>()
  let prev = new Date(session.started_at ?? session.startedAt).getTime()
  if (!Number.isFinite(prev) || prev > Date.now() + 60_000 || prev < Date.now() - 86_400_000) return json(req, { error: 'invalid_start' }, 400)
  let correct = 0
  let xp = 0
  for (const q of session.questions) {
    if (!q.question?.id || seen.has(q.question.id)) return json(req, { error: 'duplicate_question' }, 400)
    seen.add(q.question.id)
    if (q.given === undefined) continue
    const t = new Date(q.answeredAt).getTime()
    if (!(t >= prev + MIN_MS_PER_ANSWER)) return json(req, { error: 'implausible_timing' }, 400)
    prev = t
    if (q.repeated) {
      if (q.correct) xp += XP.wrong
      continue
    }
    if (q.correct) {
      correct++
      xp += XP.correct + (XP.bonus[q.question.difficulty] ?? 0)
    } else xp += XP.wrong
  }
  if (session.completedAt || session.completed_at) xp += XP.completed + (session.mode === 'full' ? XP.full : 0)

  // Fortschritt pro Entity (vereinfachtes SM-2) upserten
  const { data: progressRows } = await admin.from('user_progress').select('*').eq('user_id', me.id)
  const progress = new Map((progressRows ?? []).map((p) => [p.entity_id, p]))
  const now = new Date()
  for (const q of session.questions) {
    if (q.given === undefined || q.repeated) continue
    const id = q.question.entities?.[0]
    if (!id) continue
    if (typeof id !== 'string' || id.length > 160) continue
    const p = progress.get(id) ?? { user_id: me.id, entity_id: id, state: 'new', correct: 0, wrong: 0, streak: 0, ease: 2.5, interval_days: 0 }
    if (q.correct) {
      p.correct++
      p.streak++
      p.ease = Math.min(3, p.ease + 0.05)
      p.interval_days = p.interval_days === 0 ? 1 : p.interval_days === 1 ? 3 : Math.round(p.interval_days * p.ease)
    } else {
      p.wrong++
      p.streak = 0
      p.ease = Math.max(1.3, p.ease - 0.2)
      p.interval_days = 0
    }
    p.state = p.streak >= 5 && p.interval_days >= 14 ? 'mastered' : p.streak >= 2 ? 'familiar' : 'learning'
    p.due_at = new Date(now.getTime() + Math.max(p.interval_days, 0.5) * 86_400_000).toISOString()
    p.last_seen_at = now.toISOString()
    progress.set(id, p)
  }
  await admin.from('user_progress').upsert([...progress.values()])

  const { data: stats } = await admin.from('user_stats').select('*').eq('user_id', me.id).single()
  const answered = session.questions.filter((q: { given?: string; repeated?: boolean }) => q.given !== undefined && !q.repeated).length
  const byCat = stats?.by_category ?? {}
  const cat = (byCat[session.category] ??= { answered: 0, correct: 0 })
  cat.answered += answered
  cat.correct += correct
  await admin
    .from('user_stats')
    .update({ xp: (stats?.xp ?? 0) + xp, answered: (stats?.answered ?? 0) + answered, correct: (stats?.correct ?? 0) + correct, sessions: (stats?.sessions ?? 0) + 1, by_category: byCat })
    .eq('user_id', me.id)

  // Achievements datengetrieben aus Katalogtabelle
  const { data: defs } = await admin.from('achievements').select('*')
  const { data: have } = await admin.from('user_achievements').select('achievement_id').eq('user_id', me.id)
  const haveSet = new Set((have ?? []).map((a) => a.achievement_id))
  const total = { ...stats, xp: (stats?.xp ?? 0) + xp, correct: (stats?.correct ?? 0) + correct, sessions: (stats?.sessions ?? 0) + 1, by_category: byCat }
  const fresh = (defs ?? []).filter((a) => {
    if (haveSet.has(a.id)) return false
    const v = a.type === 'correct_answers' ? (a.category ? byCat[a.category]?.correct ?? 0 : total.correct) : a.type === 'sessions_completed' ? total.sessions : 0
    return v >= a.threshold
  })
  if (fresh.length) {
    await admin.from('user_achievements').insert(fresh.map((a) => ({ user_id: me.id, achievement_id: a.id })))
    await admin.from('user_stats').update({ xp: total.xp + fresh.length * XP.achievement }).eq('user_id', me.id)
  }

  await admin.from('quiz_sessions').upsert({
    id: session.id, user_id: me.id, category: session.category, scope: session.scope, mode: session.mode, length: String(session.length), seed: session.seed,
    started_at: session.startedAt ?? session.started_at, completed_at: session.completedAt ?? session.completed_at ?? null, questions: session.questions, score: correct, xp_earned: xp, validated: true,
  })
  return json(req, { xp, correct, answered, newAchievements: fresh.map((a) => a.id) })
})
