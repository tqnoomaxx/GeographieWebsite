import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { EntityProgress } from '@/engine/srs'
import type { QuizSession } from '@/engine/session'
import { emptyStats, type Profile, type ProgressRepository, type ProgressSnapshot, type PuzzleResult, type UserStats } from './types'

interface Schema extends DBSchema {
  kv: { key: string; value: unknown }
  entities: { key: string; value: EntityProgress }
  sessions: { key: string; value: QuizSession; indexes: { byStarted: string } }
  achievements: { key: string; value: { id: string; unlockedAt: string } }
  quests: { key: string; value: { id: string; progress: number; completedAt?: string; startedAt: string } }
  puzzles: { key: string; value: PuzzleResult }
}

/** IndexedDB-Adapter für Gäste. Wird in Phase 2 durch einen Supabase-Adapter mit gleichem Interface ergänzt. */
export class LocalRepository implements ProgressRepository {
  private db: Promise<IDBPDatabase<Schema>>
  constructor(name = 'geokompass') {
    this.db = openDB<Schema>(name, 1, {
      upgrade(db) {
        db.createObjectStore('kv')
        db.createObjectStore('entities', { keyPath: 'entityId' })
        const s = db.createObjectStore('sessions', { keyPath: 'id' })
        s.createIndex('byStarted', 'startedAt')
        db.createObjectStore('achievements', { keyPath: 'id' })
        db.createObjectStore('quests', { keyPath: 'id' })
        db.createObjectStore('puzzles', { keyPath: 'key' })
      },
    })
  }
  async getStats() {
    return ((await (await this.db).get('kv', 'stats')) as UserStats | undefined) ?? emptyStats()
  }
  async saveStats(stats: UserStats) {
    await (await this.db).put('kv', stats, 'stats')
  }
  async getEntityProgress(id: string) {
    return (await this.db).get('entities', id)
  }
  async getAllEntityProgress() {
    const all = await (await this.db).getAll('entities')
    return new Map(all.map((p) => [p.entityId, p]))
  }
  async saveEntityProgress(list: EntityProgress[]) {
    const tx = (await this.db).transaction('entities', 'readwrite')
    await Promise.all([...list.map((p) => tx.store.put(p)), tx.done])
  }
  async saveSession(session: QuizSession) {
    await (await this.db).put('sessions', session)
  }
  async getSession(id: string) {
    return (await this.db).get('sessions', id)
  }
  async getOpenSessions() {
    const all = await (await this.db).getAll('sessions')
    return all.filter((s) => !s.completedAt && s.mode === 'full').sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }
  async getRecentSessions(limit: number) {
    const all = await (await this.db).getAll('sessions')
    return all.filter((s) => s.completedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit)
  }
  async deleteSession(id: string) {
    await (await this.db).delete('sessions', id)
  }
  async getAchievements() {
    return (await this.db).getAll('achievements')
  }
  async unlockAchievement(id: string) {
    await (await this.db).put('achievements', { id, unlockedAt: new Date().toISOString() })
  }
  async getQuests() {
    return (await this.db).getAll('quests')
  }
  async saveQuest(q: { id: string; progress: number; completedAt?: string; startedAt: string }) {
    await (await this.db).put('quests', q)
  }
  async getFavorites() {
    return ((await (await this.db).get('kv', 'favorites')) as string[] | undefined) ?? []
  }
  async toggleFavorite(id: string) {
    const list = await this.getFavorites()
    const idx = list.indexOf(id)
    if (idx >= 0) list.splice(idx, 1)
    else list.push(id)
    await (await this.db).put('kv', list, 'favorites')
    return idx < 0
  }
  async getPuzzle(key: string) {
    return (await this.db).get('puzzles', key)
  }
  async savePuzzle(p: PuzzleResult) {
    await (await this.db).put('puzzles', p)
  }
  async getPuzzles() {
    return (await this.db).getAll('puzzles')
  }
  async getProfile() {
    return (await (await this.db).get('kv', 'profile')) as Profile | undefined
  }
  async saveProfile(p: Profile) {
    await (await this.db).put('kv', p, 'profile')
  }
  async exportAll(): Promise<ProgressSnapshot> {
    const db = await this.db
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      stats: await this.getStats(),
      entities: await db.getAll('entities'),
      achievements: await db.getAll('achievements'),
      quests: await db.getAll('quests'),
      favorites: await this.getFavorites(),
      sessions: await db.getAll('sessions'),
      puzzles: await db.getAll('puzzles'),
      profile: await this.getProfile(),
      settings: Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('gk.')).map((k) => [k, localStorage.getItem(k)])),
    }
  }
  async importAll(snapshot: ProgressSnapshot, strategy: 'merge' | 'replace') {
    if (strategy === 'replace') await this.clearAll()
    const db = await this.db
    const existing = await this.getAllEntityProgress()
    for (const p of snapshot.entities) {
      const cur = existing.get(p.entityId)
      // fortgeschrittener Zustand gewinnt
      if (!cur || cur.correct + cur.wrong < p.correct + p.wrong) await db.put('entities', p)
    }
    for (const a of snapshot.achievements) await db.put('achievements', a)
    for (const q of snapshot.quests) await db.put('quests', q)
    for (const s of snapshot.sessions) await db.put('sessions', s)
    for (const p of snapshot.puzzles) await db.put('puzzles', p)
    const favs = new Set([...(await this.getFavorites()), ...snapshot.favorites])
    await db.put('kv', [...favs], 'favorites')
    if (strategy === 'replace') await this.saveStats(snapshot.stats)
    else {
      const cur = await this.getStats()
      await this.saveStats(cur.answered >= snapshot.stats.answered ? cur : snapshot.stats)
    }
    if (snapshot.profile) await this.saveProfile(snapshot.profile)
  }
  async clearAll() {
    const db = await this.db
    for (const store of ['kv', 'entities', 'sessions', 'achievements', 'quests', 'puzzles'] as const) await db.clear(store)
  }
}

