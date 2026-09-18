import type { Entity } from '@/domain/types'
import type { CategoryId, GeneratorContext, Question } from './types'
import type { Generator } from './generators/base'
import { generatorsFor } from './registry'
import { createRng, type Rng } from './rng'
import { selectionWeight, type EntityProgress } from './srs'
import { matchesAnswer } from './normalize'

export type SessionMode = 'standard' | 'full' | 'repeat_errors' | 'daily' | 'learn'

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
  generatorIds?: string[]
  entityIds?: string[]
  collection?: string
  repeatMistakes?: boolean
  position: number
  score: number
  points: number
  streak: number
  bestStreak: number
  xpEarned: number
}

export interface BuildOptions {
  category: CategoryId
  scope: string
  length: number | 'all'
  mode?: SessionMode
  seed?: string
  progress?: Map<string, EntityProgress>
  onlyEntities?: string[]
  generatorIds?: string[]
  difficulty?: number
  entityFilter?: (e: Entity) => boolean
  repeatMistakes?: boolean
  collection?: string
}

/** Vereinigt die Pools aller Generatoren einer Kategorie und merkt sich, welche Generatoren eine Entity bedienen. */
export function poolFor(category: CategoryId, ctx: GeneratorContext, generatorIds?: string[]) {
  const gens = generatorsFor(category).filter((g) => !generatorIds || generatorIds.includes(g.id))
  const map = new Map<string, { entity: Entity; generators: Generator[] }>()
  for (const g of gens) {
    for (const e of g.pool(ctx)) {
      const cur = map.get(e.id) ?? { entity: e, generators: [] }
      cur.generators.push(g)
      map.set(e.id, cur)
    }
  }
  return map
}

export function buildSession(ctx: GeneratorContext, opts: BuildOptions): QuizSession {
  const seed = opts.seed ?? `${Date.now()}-${Math.random()}`
  const rng = createRng(seed)
  const pool = poolFor(opts.category, ctx, opts.generatorIds)
  let entities = [...pool.values()]
  if (opts.onlyEntities) {
    const set = new Set(opts.onlyEntities)
    entities = entities.filter((e) => set.has(e.entity.id))
  }
  if (opts.entityFilter) entities = entities.filter((e) => opts.entityFilter!(e.entity))
  const mode: SessionMode = opts.mode ?? (opts.length === 'all' ? 'full' : 'standard')
  const ordered =
    opts.length === 'all'
      ? weightedOrder(entities, opts.progress, rng)
      : weightedSample(entities, Math.min(opts.length, entities.length), opts.progress, rng)

  const difficulty = opts.difficulty ?? 2
  const questions: SessionQuestion[] = []
  const remaining: string[] = []
  const batch = opts.length === 'all' ? Math.min(ordered.length, 25) : ordered.length
  ordered.forEach((item, i) => {
    if (i >= batch) {
      remaining.push(item.entity.id)
      return
    }
    const q = makeQuestion(item, ctx, rng, difficulty)
    if (q) questions.push({ question: q })
  })
  return {
    id: `${seed}`,
    category: opts.category,
    scope: opts.scope,
    mode,
    length: opts.length,
    seed,
    startedAt: new Date().toISOString(),
    questions,
    remaining: opts.length === 'all' ? remaining : undefined,
    generatorIds: opts.generatorIds,
    entityIds: opts.entityFilter ? entities.map((e) => e.entity.id) : undefined,
    collection: opts.collection,
    repeatMistakes: opts.repeatMistakes ?? true,
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
  const pool = poolFor(session.category, ctx, session.generatorIds)
  if (session.entityIds) for (const id of [...pool.keys()]) if (!session.entityIds.includes(id)) pool.delete(id)
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

function makeQuestion(item: { entity: Entity; generators: Generator[] }, ctx: GeneratorContext, rng: Rng, difficulty: number): Question | null {
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

/** Punkte wie in der Vorgängerversion: 100 + Streak-Bonus (max. 10 × 15). */
export function pointsFor(streakBefore: number): number {
  return 100 + Math.min(streakBefore, 10) * 15
}

/**
 * Antwort verbuchen. Bei Fehlern mit repeatMistakes wird die Frage (neu gemischt) vier Positionen später erneut eingereiht.
 * Kartenfragen: falsche Klicks zählen als Versuch, die Frage bleibt offen (multiGuess).
 */
export function recordAnswer(session: QuizSession, given: string, rng: Rng = createRng(`${session.seed}-${session.position}`)): QuizSession {
  const idx = session.position
  const current = session.questions[idx]
  if (!current || current.given !== undefined) return session
  const correct = checkAnswer(current.question, given)
  const isMap = current.question.question_type === 'map_click'
  if (isMap && !correct) {
    // Frage bleibt offen, Versuch zählen, Streak zurücksetzen
    const questions = session.questions.map((q, i) => (i === idx ? { ...q, attempts: (q.attempts ?? 0) + 1 } : q))
    return { ...session, questions, streak: 0, lastWrongMapGuess: given } as QuizSession & { lastWrongMapGuess?: string }
  }
  const firstTry = !(current.attempts ?? 0)
  const countsCorrect = correct && firstTry
  const questions = session.questions.map((q, i) => (i === idx ? { ...q, given, correct: countsCorrect, answeredAt: new Date().toISOString(), attempts: (q.attempts ?? 0) + 1 } : q))
  if (!countsCorrect && session.repeatMistakes && !isMap && !current.repeated) {
    const q = current.question
    const options = q.options ? rng.shuffle(q.options) : undefined
    const repeated: SessionQuestion = { question: { ...q, id: `${q.id}#r`, options }, repeated: true }
    const insertAt = Math.min(questions.length, idx + 4)
    questions.splice(insertAt, 0, repeated)
  }
  const streak = countsCorrect ? session.streak + 1 : 0
  return {
    ...session,
    questions,
    score: session.score + (countsCorrect ? 1 : 0),
    points: session.points + (countsCorrect ? pointsFor(session.streak) : 0),
    streak,
    bestStreak: Math.max(session.bestStreak, streak),
  }
}
