import type { Entity } from '@/domain/types'
import type { CategoryId, GeneratorContext, Question } from './types'
import type { Generator } from './generators/base'
import { generatorsFor } from './registry'
import { contentFilter, type RoundConfig } from './round'
import { createRng, type Rng } from './rng'
import { selectionWeight, type EntityProgress } from './srs'
import { matchesAnswer } from './normalize'
import { modeFor } from '@/config/quizzes'

/** standard = feste Länge · full = „Alle“ (gespeichert, fortsetzbar) · repeat_errors = nur die Fehler einer Runde */
export type SessionMode = 'standard' | 'full' | 'repeat_errors'

export interface SessionQuestion {
  question: Question
  repeated?: boolean
  attempts?: number
  given?: string
  correct?: boolean
  answeredAt?: string
  ms?: number
}

export interface QuizSession {
  id: string
  /** Was gespielt wird – identisch zu URL und Anzeige. */
  setup: RoundConfig
  category: CategoryId
  scope: string
  mode: SessionMode
  length: number | 'all'
  seed: string
  startedAt: string
  completedAt?: string
  questions: SessionQuestion[]
  /** Nur bei mode=full: noch nicht gestellte Entities zum Fortsetzen. */
  remaining?: string[]
  /** Kartenfrage: letzter Fehlklick (rot markieren, R7). */
  lastWrongMapGuess?: string
  position: number
  score: number
  points: number
  streak: number
  bestStreak: number
  xpEarned: number
}

/** Anzahl der ursprünglich gewählten Lernkarten. Eingereihte Wiederholungen verändern die Rundengröße nicht. */
export function baseQuestionTotal(session: Pick<QuizSession, 'questions' | 'remaining'>): number {
  return session.questions.filter((q) => !q.repeated).length + (session.remaining?.length ?? 0)
}

/** Position innerhalb der ursprünglichen Runde. Bei einer Wiederholung bleibt der Zähler stabil. */
export function baseQuestionPosition(session: Pick<QuizSession, 'questions' | 'remaining' | 'position'>): number {
  const total = baseQuestionTotal(session)
  const position = session.questions.slice(0, session.position + 1).filter((q) => !q.repeated).length
  return Math.max(1, Math.min(total, position))
}

/** Noch offene Wiederholungen, inklusive einer gerade angezeigten Wiederholungsfrage. */
export function pendingRepeatCount(session: Pick<QuizSession, 'questions' | 'position'>): number {
  return session.questions.slice(session.position).filter((q) => q.repeated && q.given === undefined).length
}

export interface BuildOptions {
  seed?: string
  progress?: Map<string, EntityProgress>
  difficulty?: number
}

interface PoolItem {
  entity: Entity
  generators: Generator[]
}

/** Alle Lernkarten eines Setups (Kategorie, Fragetyp, Bereich, Inhalt) und die Generatoren, die sie bedienen. */
export function poolFor(ctx: GeneratorContext, setup: Pick<RoundConfig, 'category' | 'mode' | 'content'>): Map<string, PoolItem> {
  const content = modeFor(setup.category, setup.mode)?.content ?? setup.content
  const keep = contentFilter(content)
  const map = new Map<string, PoolItem>()
  for (const g of generatorsFor(setup.category, setup.mode)) {
    for (const e of g.pool(ctx)) {
      if (keep && !keep(e)) continue
      const cur = map.get(e.id) ?? { entity: e, generators: [] }
      cur.generators.push(g)
      map.set(e.id, cur)
    }
  }
  return map
}

export function buildSession(ctx: GeneratorContext, setup: RoundConfig, opts: BuildOptions = {}): QuizSession {
  const seed = opts.seed ?? `${Date.now()}-${Math.random()}`
  const rng = createRng(seed)
  let entities = [...poolFor(ctx, setup).values()]
  if (setup.only) {
    const set = new Set(setup.only)
    entities = entities.filter((e) => set.has(e.entity.id))
  }
  const mode: SessionMode = setup.only ? 'repeat_errors' : setup.length === 'all' ? 'full' : 'standard'
  const ordered = setup.length === 'all' ? weightedOrder(entities, opts.progress, rng) : weightedSample(entities, Math.min(setup.length, entities.length), opts.progress, rng)

  const difficulty = opts.difficulty ?? 2
  const questions: SessionQuestion[] = []
  const remaining: string[] = []
  const batch = setup.length === 'all' ? Math.min(ordered.length, 25) : ordered.length
  ordered.forEach((item, i) => {
    if (i >= batch) {
      remaining.push(item.entity.id)
      return
    }
    const q = makeQuestion(item, ctx, rng, difficulty)
    if (q) questions.push({ question: q })
  })
  // Konnte zu einer Karte keine Frage gebaut werden, mit weiteren Karten der Sammlung auffüllen (R1: gewählte Länge).
  if (setup.length !== 'all' && questions.length < setup.length) {
    const used = new Set(ordered.map((o) => o.entity.id))
    for (const item of weightedOrder(entities.filter((e) => !used.has(e.entity.id)), opts.progress, rng)) {
      if (questions.length >= setup.length) break
      const q = makeQuestion(item, ctx, rng, difficulty)
      if (q) questions.push({ question: q })
    }
  }
  return {
    id: `${seed}`,
    setup,
    category: setup.category,
    scope: setup.scope,
    mode,
    length: setup.length,
    seed,
    startedAt: new Date().toISOString(),
    questions,
    remaining: setup.length === 'all' ? remaining : undefined,
    position: 0,
    score: 0,
    points: 0,
    streak: 0,
    bestStreak: 0,
    xpEarned: 0,
  }
}

/** Lädt bei „Alle“-Runden die nächsten Fragen nach. */
export function extendSession(session: QuizSession, ctx: GeneratorContext, count = 25, difficulty = 2): QuizSession {
  if (!session.remaining?.length) return session
  const rng = createRng(`${session.seed}-${session.questions.length}`)
  const pool = poolFor(ctx, session.setup)
  const next = session.remaining.slice(0, count)
  const rest = session.remaining.slice(count)
  const added: SessionQuestion[] = []
  for (const id of next) {
    const item = pool.get(id)
    if (!item) continue
    const q = makeQuestion(item, ctx, rng, difficulty)
    if (q) added.push({ question: q })
  }
  return { ...session, questions: [...session.questions, ...added], remaining: rest }
}

function makeQuestion(item: PoolItem, ctx: GeneratorContext, rng: Rng, difficulty: number): Question | null {
  for (const g of rng.shuffle(item.generators)) {
    const q = g.make(item.entity, ctx, rng, difficulty)
    if (q) return q
  }
  return null
}

function weightedSample<T extends { entity: Entity }>(items: T[], n: number, progress: Map<string, EntityProgress> | undefined, rng: Rng): T[] {
  const weighted = items.map((it) => ({ it, w: selectionWeight(progress?.get(it.entity.id)) }))
  const out: T[] = []
  const used = new Set<number>()
  while (out.length < n && used.size < weighted.length) {
    let total = 0
    for (let i = 0; i < weighted.length; i++) if (!used.has(i)) total += weighted[i].w
    let r = rng.next() * total
    for (let i = 0; i < weighted.length; i++) {
      if (used.has(i)) continue
      r -= weighted[i].w
      if (r <= 0) {
        used.add(i)
        out.push(weighted[i].it)
        break
      }
    }
  }
  return out
}

/** Für „Alle“: jede Entity genau einmal, schwache zuerst, Rest gemischt. */
function weightedOrder<T extends { entity: Entity }>(items: T[], progress: Map<string, EntityProgress> | undefined, rng: Rng): T[] {
  return rng
    .shuffle(items)
    .map((it) => ({ it, w: selectionWeight(progress?.get(it.entity.id)) + rng.next() * 0.5 }))
    .sort((a, b) => b.w - a.w)
    .map((x) => x.it)
}

export function checkAnswer(q: Question, given: string): boolean {
  if (q.question_type === 'text_input') return matchesAnswer(given, q.accepted ?? [])
  return given === q.answer
}

export function labelFor(q: Question, id: string, byId: Map<string, Entity>): string {
  const opt = q.options?.find((o) => o.id === id)
  if (opt?.label) return opt.label
  return byId.get(id)?.names.de ?? id
}

/** Punkte wie in der Vorgängerversion: 100 + Streak-Bonus (max. 10 × 15), R6. */
export function pointsFor(streakBefore: number): number {
  return 100 + Math.min(streakBefore, 10) * 15
}

/**
 * Antwort verbuchen (R5–R7). Bei Fehlern mit setup.repeat wird die Frage (neu gemischt) vier Positionen später erneut eingereiht.
 * Kartenfragen: falsche Klicks zählen als Versuch, die Frage bleibt offen.
 */
export function recordAnswer(session: QuizSession, given: string, rng: Rng = createRng(`${session.seed}-${session.position}`)): QuizSession {
  const idx = session.position
  const current = session.questions[idx]
  if (!current || current.given !== undefined) return session
  const correct = checkAnswer(current.question, given)
  const isMap = current.question.question_type === 'map_click'
  if (isMap && !correct) {
    const questions = session.questions.map((q, i) => (i === idx ? { ...q, attempts: (q.attempts ?? 0) + 1 } : q))
    return { ...session, questions, streak: 0, lastWrongMapGuess: given }
  }
  const firstTry = !(current.attempts ?? 0)
  const countsCorrect = correct && firstTry
  const questions = session.questions.map((q, i) => (i === idx ? { ...q, given, correct: countsCorrect, answeredAt: new Date().toISOString(), attempts: (q.attempts ?? 0) + 1 } : q))
  if (!countsCorrect && session.setup.repeat && !isMap && !current.repeated) {
    const q = current.question
    const options = q.options ? rng.shuffle(q.options) : undefined
    const repeated: SessionQuestion = { question: { ...q, id: `${q.id}#r`, options }, repeated: true }
    questions.splice(Math.min(questions.length, idx + 4), 0, repeated)
  }
  const streak = countsCorrect ? session.streak + 1 : 0
  return {
    ...session,
    questions,
    lastWrongMapGuess: undefined,
    score: session.score + (countsCorrect ? 1 : 0),
    points: session.points + (countsCorrect ? pointsFor(session.streak) : 0),
    streak,
    bestStreak: Math.max(session.bestStreak, streak),
  }
}

/** Aufgabe überspringen (Europa-Karte): zählt als Fehler, keine Wiederholung (R7). */
export function skipQuestion(session: QuizSession): QuizSession {
  const idx = session.position
  const current = session.questions[idx]
  if (!current || current.given !== undefined) return session
  const questions = session.questions.map((q, i) => (i === idx ? { ...q, given: '__skip__', correct: false, answeredAt: new Date().toISOString(), attempts: (q.attempts ?? 0) + 1 } : q))
  return { ...session, questions, streak: 0, lastWrongMapGuess: undefined }
}

/** Nächste Frage; bei „Alle“ werden weitere Fragen nachgeladen. Liefert null, wenn die Runde zu Ende ist. */
export function advanceSession(session: QuizSession, ctx: GeneratorContext): QuizSession | null {
  let s: QuizSession = { ...session, position: session.position + 1, lastWrongMapGuess: undefined }
  if (s.position >= s.questions.length && s.remaining?.length) s = extendSession(s, ctx)
  return s.position >= s.questions.length ? null : s
}

/** Setup einer Session; ältere gespeicherte Runden ohne `setup` werden aus den Grundfeldern rekonstruiert. */
export function setupOf(s: Pick<QuizSession, 'category' | 'scope' | 'length'> & { setup?: RoundConfig }): RoundConfig {
  return s.setup ?? { category: s.category, mode: 'auto', scope: s.scope, length: s.length, repeat: true }
}
