import type { EntityProgress } from '@/engine/srs'
import type { QuizSession } from '@/engine/session'
import type { CategoryId } from '@/engine/types'

export interface CategoryStats {
  answered: number
  correct: number
}

export interface UserStats {
  xp: number
  answered: number
  correct: number
  sessions: number
  fullRuns: number
  puzzlesSolved: number
  byCategory: Partial<Record<CategoryId, CategoryStats>>
  continentsPlayed: string[]
  streak: { current: number; best: number; lastActive?: string }
  learned: number
}

export interface PuzzleResult {
  key: string // `${puzzle}:${date}`
  puzzle: string
  date: string
  guesses: string[]
  solved: boolean
  finishedAt?: string
}

export interface Profile {
  username: string
  avatar: string
  color: string
  title?: string
  featuredAchievements: string[]
  favoriteCategory?: CategoryId
  createdAt: string
}

export interface ProgressSnapshot {
  version: 1
  exportedAt: string
  stats: UserStats
  entities: EntityProgress[]
  achievements: Array<{ id: string; unlockedAt: string }>
  quests: Array<{ id: string; progress: number; completedAt?: string; startedAt: string }>
  favorites: string[]
  sessions: QuizSession[]
  puzzles: PuzzleResult[]
  profile?: Profile
  settings: Record<string, unknown>
}

export interface ProgressRepository {
  getStats(): Promise<UserStats>
  saveStats(stats: UserStats): Promise<void>
  getEntityProgress(id: string): Promise<EntityProgress | undefined>
  getAllEntityProgress(): Promise<Map<string, EntityProgress>>
  saveEntityProgress(list: EntityProgress[]): Promise<void>
  saveSession(session: QuizSession): Promise<void>
  getSession(id: string): Promise<QuizSession | undefined>
  getOpenSessions(): Promise<QuizSession[]>
  getRecentSessions(limit: number): Promise<QuizSession[]>
  deleteSession(id: string): Promise<void>
  getAchievements(): Promise<Array<{ id: string; unlockedAt: string }>>
  unlockAchievement(id: string): Promise<void>
  getQuests(): Promise<Array<{ id: string; progress: number; completedAt?: string; startedAt: string }>>
  saveQuest(q: { id: string; progress: number; completedAt?: string; startedAt: string }): Promise<void>
  getFavorites(): Promise<string[]>
  toggleFavorite(id: string): Promise<boolean>
  getPuzzle(key: string): Promise<PuzzleResult | undefined>
  savePuzzle(p: PuzzleResult): Promise<void>
  getPuzzles(): Promise<PuzzleResult[]>
  getProfile(): Promise<Profile | undefined>
  saveProfile(p: Profile): Promise<void>
  exportAll(): Promise<ProgressSnapshot>
  importAll(snapshot: ProgressSnapshot, strategy: 'merge' | 'replace'): Promise<void>
  clearAll(): Promise<void>
}

export function emptyStats(): UserStats {
  return {
    xp: 0,
    answered: 0,
    correct: 0,
    sessions: 0,
    fullRuns: 0,
    puzzlesSolved: 0,
    byCategory: {},
    continentsPlayed: [],
    streak: { current: 0, best: 0 },
    learned: 0,
  }
}
