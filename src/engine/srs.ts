/**
 * Vereinfachtes SM-2 pro Entity. Zustände: new → learning → familiar → mastered.
 * Intervall in Tagen; falsche Antwort setzt auf 'learning' zurück.
 */
export type LearnState = 'new' | 'learning' | 'familiar' | 'mastered'

export interface EntityProgress {
  entityId: string
  state: LearnState
  correct: number
  wrong: number
  streak: number
  ease: number
  intervalDays: number
  dueAt: string // ISO-Datum
  lastSeenAt: string
}

const DAY = 86_400_000

export function initialProgress(entityId: string, now = new Date()): EntityProgress {
  return {
    entityId,
    state: 'new',
    correct: 0,
    wrong: 0,
    streak: 0,
    ease: 2.5,
    intervalDays: 0,
    dueAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
  }
}

export function review(p: EntityProgress, correct: boolean, now = new Date()): EntityProgress {
  const next = { ...p, lastSeenAt: now.toISOString() }
  if (correct) {
    next.correct++
    next.streak++
    next.ease = Math.min(3.0, p.ease + 0.05)
    next.intervalDays = p.intervalDays === 0 ? 1 : p.intervalDays === 1 ? 3 : Math.round(p.intervalDays * next.ease)
  } else {
    next.wrong++
    next.streak = 0
    next.ease = Math.max(1.3, p.ease - 0.2)
    next.intervalDays = 0
  }
  next.dueAt = new Date(now.getTime() + Math.max(next.intervalDays, 0.5) * DAY).toISOString()
  next.state = stateFor(next)
  return next
}

export function stateFor(p: EntityProgress): LearnState {
  if (p.correct + p.wrong === 0) return 'new'
  if (p.streak >= 5 && p.intervalDays >= 14) return 'mastered'
  if (p.streak >= 2) return 'familiar'
  return 'learning'
}

/** Gewicht für die Auswahl: fällige und schwache Inhalte häufiger. */
export function selectionWeight(p: EntityProgress | undefined, now = new Date()): number {
  if (!p) return 3
  const due = new Date(p.dueAt).getTime() <= now.getTime()
  const accuracy = p.correct / Math.max(1, p.correct + p.wrong)
  let w = 1
  if (due) w += 2
  if (p.state === 'learning') w += 2
  if (p.state === 'mastered') w *= 0.3
  w += (1 - accuracy) * 2
  return w
}
