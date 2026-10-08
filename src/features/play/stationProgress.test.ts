import { describe, expect, it } from 'vitest'
import { emptyStats, type PuzzleResult } from '@/services/progress/types'
import {
  buildStationProgress,
  DAILY_THRESHOLDS,
  MIXED_THRESHOLDS,
  NORMAL_THRESHOLDS,
} from './stationProgress'

function statsWith(answered: number, category: 'flags' | 'countries' = 'flags') {
  const stats = emptyStats()
  stats.answered = answered
  stats.byCategory[category] = { answered, correct: 0 }
  return stats
}

describe('station progress', () => {
  it.each([
    [49, 0, 50],
    [50, 1, 250],
    [51, 1, 250],
    [249, 1, 250],
    [250, 2, 750],
    [251, 2, 750],
    [749, 2, 750],
    [750, 3, 1_500],
    [751, 3, 1_500],
    [1_499, 3, 1_500],
    [1_500, 4, undefined],
    [1_501, 4, undefined],
  ])('maps %i normal questions to level %i', (answered, level, nextThreshold) => {
    const progress = buildStationProgress(statsWith(answered), []).flags
    expect(NORMAL_THRESHOLDS).toEqual([50, 250, 750, 1_500])
    expect(progress).toMatchObject({ level, value: answered, nextThreshold })
  })

  it.each([
    [249, 0, 250],
    [250, 1, 1_000],
    [1_000, 2, 3_000],
    [3_000, 3, 7_500],
    [7_500, 4, undefined],
  ])('uses global answered questions for mixed at %i', (answered, level, nextThreshold) => {
    const stats = statsWith(answered)
    stats.byCategory.mixed = { answered: 0, correct: 0 }
    const progress = buildStationProgress(stats, []).mixed
    expect(MIXED_THRESHOLDS).toEqual([250, 1_000, 3_000, 7_500])
    expect(progress).toMatchObject({ level, value: answered, nextThreshold })
  })

  it.each([
    [4, 0, 5],
    [5, 1, 25],
    [25, 2, 75],
    [75, 3, 150],
    [150, 4, undefined],
  ])('counts %i solved regular daily puzzles', (count, level, nextThreshold) => {
    const puzzles: PuzzleResult[] = Array.from({ length: count }, (_, index) => ({
      key: `flagle:2026-01-${String(index + 1).padStart(2, '0')}`,
      puzzle: 'flagle',
      date: `2026-01-${String(index + 1).padStart(2, '0')}`,
      guesses: ['country:DE'],
      solved: true,
    }))
    puzzles.push({
      key: 'flagle:practice:1',
      puzzle: 'flagle',
      date: 'practice:1',
      guesses: [],
      solved: true,
    })
    puzzles.push({ key: 'flagle:lost', puzzle: 'flagle', date: '2025-01-01', guesses: [], solved: false })
    const progress = buildStationProgress(emptyStats(), puzzles).daily
    expect(DAILY_THRESHOLDS).toEqual([5, 25, 75, 150])
    expect(progress).toMatchObject({ level, value: count, nextThreshold })
  })

  it('aggregates legacy categories and tolerates missing values', () => {
    const stats = emptyStats()
    stats.byCategory.countries = { answered: 30, correct: 20 }
    stats.byCategory.regions = { answered: 12, correct: 8 }
    stats.byCategory.maps = { answered: 9, correct: 7 }
    stats.byCategory.landmarks = { answered: 45, correct: 30 }
    stats.byCategory.images = { answered: 10, correct: 8 }

    const progress = buildStationProgress(stats, [])
    expect(progress.countries).toMatchObject({ value: 51, level: 1 })
    expect(progress.landmarks).toMatchObject({ value: 55, level: 1 })
    expect(progress.languages).toMatchObject({ value: 0, level: 0 })
  })

  it('reports progress within the current construction stage', () => {
    expect(buildStationProgress(statsWith(25), []).flags.progress).toBe(0.5)
    expect(buildStationProgress(statsWith(150), []).flags.progress).toBe(0.5)
    expect(buildStationProgress(statsWith(1_500), []).flags.progress).toBe(1)
  })
})
