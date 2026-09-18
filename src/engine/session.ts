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
  position: number
  score: number
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
    position: 0,
    score: 0,
    xpEarned: 0,
  }
}

/** Lädt bei „Alle“-Runden die nächsten Fragen nach. */
export function extendSession(session: QuizSession, ctx: GeneratorContext, count = 25, difficulty = 2): QuizSession {
  if (!session.remaining?.length) return session
  const rng = createRng(`${session.seed}-${session.questions.length}`)
  const pool = poolFor(session.category, ctx)
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
