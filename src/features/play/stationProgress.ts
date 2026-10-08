import { PLAY_QUIZZES } from '@/config/quizzes'
import type { CategoryId } from '@/engine/types'
import type { PuzzleResult, UserStats } from '@/services/progress/types'

export type PlayStationId = CategoryId | 'daily'
export type StationProgressUnit = 'questions' | 'puzzles'

export interface StationProgress {
  id: PlayStationId
  level: 0 | 1 | 2 | 3 | 4
  value: number
  nextThreshold?: number
  progress: number
  unit: StationProgressUnit
}

export type StationProgressMap = Record<string, StationProgress>

export const NORMAL_THRESHOLDS = [50, 250, 750, 1_500] as const
export const MIXED_THRESHOLDS = [250, 1_000, 3_000, 7_500] as const
export const DAILY_THRESHOLDS = [5, 25, 75, 150] as const

function progressFor(
  id: PlayStationId,
  value: number,
  thresholds: readonly number[],
  unit: StationProgressUnit,
): StationProgress {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  const level = thresholds.filter((threshold) => safeValue >= threshold).length as StationProgress['level']
  const nextThreshold = thresholds[level]
  const previousThreshold = level === 0 ? 0 : thresholds[level - 1]
  const progress = nextThreshold
    ? Math.min(1, Math.max(0, (safeValue - previousThreshold) / (nextThreshold - previousThreshold)))
    : 1

  return { id, level, value: safeValue, nextThreshold, progress, unit }
}

function categoryAnswered(stats: UserStats, id: CategoryId, mergedFrom: CategoryId[] = []) {
  const categories = new Set([id, ...mergedFrom])
  let answered = 0
  for (const category of categories) answered += stats.byCategory?.[category]?.answered ?? 0
  return answered
}

function solvedDailyPuzzles(puzzles: PuzzleResult[]) {
  const solved = new Set<string>()
  for (const puzzle of puzzles) {
    if (!puzzle.solved || puzzle.date.startsWith('practice:') || puzzle.key.includes(':practice:')) continue
    solved.add(puzzle.key)
  }
  return solved.size
}

/**
 * Renderer-unabhängiges Fortschrittsmodell für Menü, DOM-HUD und 3D-Diorama.
 * Alte, inzwischen zusammengeführte Kategorien werden weiterhin mitgezählt.
 */
export function buildStationProgress(stats: UserStats, puzzles: PuzzleResult[]): StationProgressMap {
  const result: StationProgressMap = {}
  for (const quiz of PLAY_QUIZZES) {
    const value =
      quiz.id === 'mixed' ? (stats.answered ?? 0) : categoryAnswered(stats, quiz.id, quiz.mergedFrom)
    result[quiz.id] = progressFor(
      quiz.id,
      value,
      quiz.id === 'mixed' ? MIXED_THRESHOLDS : NORMAL_THRESHOLDS,
      'questions',
    )
  }
  result.daily = progressFor('daily', solvedDailyPuzzles(puzzles), DAILY_THRESHOLDS, 'puzzles')
  return result
}
