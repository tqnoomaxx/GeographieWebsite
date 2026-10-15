import { describe, expect, it } from 'vitest'
import type { Question } from '@/engine/types'
import type { QuizSession } from '@/engine/session'
import type { ProgressRepository, UserStats } from '@/services/progress/types'
import { emptyStats } from '@/services/progress/types'
import { applySession } from './index'
import { buildSession, recordAnswer } from '@/engine/session'
import { buildContext } from '@/engine/context'
import { readFileSync } from 'node:fs'
import { defaultRound } from '@/engine/round'
import { XP } from '@/config/xp'

function question(id: string): Question {
  return {
    id,
    category: 'flags',
    type: 'flag_to_country',
    question_type: 'multiple_choice',
    prompt: { key: 'q.flag_to_country' },
    answer: 'country:DE',
    difficulty: 1,
    entities: ['country:DE'],
    metadata: { generator: 'flag_to_country', scope: 'world' },
  }
}

function repository(stats: UserStats): ProgressRepository {
  return {
    getStats: async () => stats,
    saveStats: async (next) => Object.assign(stats, next),
    getEntityProgress: async () => undefined,
    getAllEntityProgress: async () => new Map(),
    saveEntityProgress: async () => undefined,
    saveSession: async () => undefined,
    getSession: async () => undefined,
    getOpenSessions: async () => [],
    getRecentSessions: async () => [],
    deleteSession: async () => undefined,
    getAchievements: async () => [],
    unlockAchievement: async () => undefined,
    getQuests: async () => [],
    saveQuest: async () => undefined,
    getFavorites: async () => [],
    toggleFavorite: async () => true,
    getPuzzle: async () => undefined,
    savePuzzle: async () => undefined,
    getPuzzles: async () => [],
    getProfile: async () => undefined,
    saveProfile: async () => undefined,
    exportAll: async () => ({
      version: 1,
      exportedAt: '',
      stats,
      entities: [],
      achievements: [],
      quests: [],
      favorites: [],
      sessions: [],
      puzzles: [],
      settings: {},
    }),
    importAll: async () => undefined,
    clearAll: async () => undefined,
  }
}

describe('applySession statistics', () => {
  it('vergibt nach vorzeitigem Beenden Antwort-XP, aber keinen Abschlussbonus', async () => {
    const countries = JSON.parse(readFileSync('public/data/entities/countries.json', 'utf8'))
    const ctx = buildContext({ countries, cities: [], landmarks: [], regions: [], relationships: [], scope: 'world' })
    let session = buildSession(ctx, { ...defaultRound('flags'), mode: 'flag_to_name', content: ['country'], length: 3, repeat: false }, { seed: 'quit' })
    session = recordAnswer(session, session.questions[0].question.answer)
    session.completedAt = new Date().toISOString()
    const stats = emptyStats()
    const out = await applySession(repository(stats), session, ctx.byId)
    expect(stats.sessions).toBe(0)
    expect(stats.answered).toBe(1)
    expect(out.xp).toBe(XP.correct_answer + (XP.difficulty_bonus[session.questions[0].question.difficulty] ?? 0) + XP.new_entity_seen)
  })
  it('counts wrong base answers and excludes repeated questions', async () => {
    const stats = emptyStats()
    const session: QuizSession = {
      id: 'statistics-test',
      setup: { category: 'flags', mode: 'auto', scope: 'world', length: 1, repeat: true },
      category: 'flags',
      scope: 'world',
      mode: 'standard',
      length: 1,
      seed: 'statistics-test',
      startedAt: '2026-01-01T10:00:00.000Z',
      completedAt: '2026-01-01T10:01:00.000Z',
      questions: [
        {
          question: question('base'),
          given: 'country:FR',
          correct: false,
          answeredAt: '2026-01-01T10:00:20.000Z',
        },
        {
          question: question('repeat'),
          repeated: true,
          given: 'country:DE',
          correct: true,
          answeredAt: '2026-01-01T10:00:40.000Z',
        },
      ],
      position: 1,
      score: 0,
      points: 0,
      streak: 0,
      bestStreak: 0,
      xpEarned: 0,
    }

    await applySession(repository(stats), session, new Map())

    expect(stats.answered).toBe(1)
    expect(stats.correct).toBe(0)
    expect(stats.sessions).toBe(1)
    expect(stats.byCategory.flags).toEqual({ answered: 1, correct: 0 })
  })
})
