// Edge Function: nimmt eine Quiz-Session entgegen, prüft Plausibilität und berechnet XP/Fortschritt serverseitig.
// Der Client darf XP, Achievements und Quests niemals selbst setzen (Anti-Cheat, TASK.md §99).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const XP = { correct: 10, wrong: 2, bonus: { 1: 0, 2: 5, 3: 10 } as Record<number, number>, completed: 25, full: 100, achievement: 100 }
const MAX_QUESTIONS_PER_SESSION = 2000
const MIN_MS_PER_ANSWER = 250

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const auth = req.headers.get('Authorization') ?? ''
  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: me } = await user.auth.getUser()
  if (!me?.user) return json({ error: 'unauthorized' }, 401)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const session = await req.json()
  if (!session?.id || !Array.isArray(session.questions) || session.questions.length > MAX_QUESTIONS_PER_SESSION) return json({ error: 'invalid' }, 400)
  const { data: existing } = await admin.from('quiz_sessions').select('id, validated').eq('id', session.id).maybeSingle()
  if (existing?.validated) return json({ error: 'already_processed' }, 409)

  // Plausibilität: Antwortzeiten, Reihenfolge, keine doppelten Fragen
  const seen = new Set<string>()
  let prev = new Date(session.started_at ?? session.startedAt).getTime()
  let correct = 0
  let xp = 0
  for (const q of session.questions) {
    if (!q.question?.id || seen.has(q.question.id)) return json({ error: 'duplicate_question' }, 400)
    seen.add(q.question.id)
    if (q.given === undefined) continue
    const t = new Date(q.answeredAt).getTime()
    if (!(t >= prev + MIN_MS_PER_ANSWER)) return json({ error: 'implausible_timing' }, 400)
    prev = t
    if (q.correct) {
      correct++
      xp += XP.correct + (XP.bonus[q.question.difficulty] ?? 0)
    } else xp += XP.wrong
  }
  if (session.completedAt || session.completed_at) xp += XP.completed + (session.mode === 'full' ? XP.full : 0)

  // Fortschritt pro Entity (vereinfachtes SM-2) upserten
  const { data: progressRows } = await admin.from('user_progress').select('*').eq('user_id', me.user.id)
  const progress = new Map((progressRows ?? []).map((p) => [p.entity_id, p]))
  const now = new Date()
  for (const q of session.questions) {
    if (q.given === undefined) continue
    const id = q.question.entities?.[0]
    if (!id) continue
    const p = progress.get(id) ?? { user_id: me.user.id, entity_id: id, state: 'new', correct: 0, wrong: 0, streak: 0, ease: 2.5, interval_days: 0 }
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

  const { data: stats } = await admin.from('user_stats').select('*').eq('user_id', me.user.id).single()
  const answered = session.questions.filter((q: { given?: string }) => q.given !== undefined).length
  const byCat = stats?.by_category ?? {}
  const cat = (byCat[session.category] ??= { answered: 0, correct: 0 })
  cat.answered += answered
  cat.correct += correct
  await admin
    .from('user_stats')
    .update({ xp: (stats?.xp ?? 0) + xp, answered: (stats?.answered ?? 0) + answered, correct: (stats?.correct ?? 0) + correct, sessions: (stats?.sessions ?? 0) + 1, by_category: byCat })
    .eq('user_id', me.user.id)

  // Achievements datengetrieben aus Katalogtabelle
  const { data: defs } = await admin.from('achievements').select('*')
  const { data: have } = await admin.from('user_achievements').select('achievement_id').eq('user_id', me.user.id)
  const haveSet = new Set((have ?? []).map((a) => a.achievement_id))
  const total = { ...stats, xp: (stats?.xp ?? 0) + xp, correct: (stats?.correct ?? 0) + correct, sessions: (stats?.sessions ?? 0) + 1, by_category: byCat }
  const fresh = (defs ?? []).filter((a) => {
    if (haveSet.has(a.id)) return false
    const v = a.type === 'correct_answers' ? (a.category ? byCat[a.category]?.correct ?? 0 : total.correct) : a.type === 'sessions_completed' ? total.sessions : 0
    return v >= a.threshold
  })
  if (fresh.length) {
    await admin.from('user_achievements').insert(fresh.map((a) => ({ user_id: me.user.id, achievement_id: a.id })))
    await admin.from('user_stats').update({ xp: total.xp + fresh.length * XP.achievement }).eq('user_id', me.user.id)
  }

  await admin.from('quiz_sessions').upsert({
    id: session.id, user_id: me.user.id, category: session.category, scope: session.scope, mode: session.mode, length: String(session.length), seed: session.seed,
    started_at: session.startedAt ?? session.started_at, completed_at: session.completedAt ?? session.completed_at ?? null, questions: session.questions, score: correct, xp_earned: xp, validated: true,
  })
  return json({ xp, correct, answered, newAchievements: fresh.map((a) => a.id) })
})
