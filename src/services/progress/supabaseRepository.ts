import type { EntityProgress } from '@/engine/srs'
import type { QuizSession } from '@/engine/session'
import { LocalRepository } from './localRepository'
import type { Profile, ProgressRepository, ProgressSnapshot, PuzzleResult, UserStats } from './types'
import { getSupabase } from '@/services/auth'

/**
 * Supabase-Adapter. Implementiert dasselbe Interface wie LocalRepository.
 * Strategie: lokal bleibt der schnelle Cache (offline-fähig); Schreibvorgänge mit XP-Relevanz gehen an Edge Functions,
 * Lesevorgänge kommen vom Server, wenn online. Aktiv nur, wenn VITE_SUPABASE_URL gesetzt und der Nutzer eingeloggt ist.
 *
 * Die Supabase-Bibliothek wird erst bei Bedarf dynamisch geladen, damit die statische Phase-1-App klein bleibt.
 */
export class SupabaseRepository implements ProgressRepository {
  private local = new LocalRepository('geokompass-cache')
  private client: Promise<SupabaseLike>

  constructor() {
    this.client = getSupabase() as unknown as Promise<SupabaseLike>
  }

  private async userId(): Promise<string | null> {
    const c = await this.client
    const { data } = await c.auth.getUser()
    return data.user?.id ?? null
  }

  private async ownRows(table: string, columns: string): Promise<Array<Record<string, never>> | null> {
    const c = await this.client
    const uid = await this.userId()
    if (!uid || !navigator.onLine) return null
    const rows: Array<Record<string, never>> = []
    for (let start = 0; ; start += 1000) {
      const { data, error } = await c.from(table).select(columns).eq('user_id', uid).range(start, start + 999)
      if (error) throw error
      rows.push(...(data ?? []))
      if (!data || data.length < 1000) return rows
    }
  }

  async getStats(): Promise<UserStats> {
    const c = await this.client
    const uid = await this.userId()
    if (!uid || !navigator.onLine) return this.local.getStats()
    const { data } = await c.from('user_stats').select('*').eq('user_id', uid).maybeSingle()
    if (!data) return this.local.getStats()
    const stats: UserStats = {
      xp: data.xp,
      answered: data.answered,
      correct: data.correct,
      sessions: data.sessions,
      fullRuns: data.full_runs,
      puzzlesSolved: data.puzzles_solved,
      byCategory: data.by_category,
      continentsPlayed: data.continents_played,
      streak: { current: data.streak_current, best: data.streak_best, lastActive: data.streak_last_active ?? undefined },
      learned: data.learned,
    }
    await this.local.saveStats(stats)
    return stats
  }
  /** Stats werden serverseitig berechnet; lokal nur cachen. */
  async saveStats(stats: UserStats) {
    await this.local.saveStats(stats)
  }
  async getEntityProgress(id: string) {
    return (await this.getAllEntityProgress()).get(id)
  }
  async getAllEntityProgress() {
    const data = await this.ownRows('user_progress', '*')
    if (!data) return this.local.getAllEntityProgress()
    const list: EntityProgress[] = (data ?? []).map((p) => ({
      entityId: p.entity_id, state: p.state, correct: p.correct, wrong: p.wrong, streak: p.streak, ease: p.ease, intervalDays: p.interval_days, dueAt: p.due_at, lastSeenAt: p.last_seen_at,
    }))
    await this.local.saveEntityProgress(list)
    return new Map(list.map((p) => [p.entityId, p]))
  }
  async saveEntityProgress(list: EntityProgress[]) {
    await this.local.saveEntityProgress(list)
  }
  /** Abgeschlossene Sessions gehen an die Edge Function; offline werden sie gepuffert und beim nächsten Sync gesendet. */
  async saveSession(session: QuizSession) {
    await this.local.saveSession(session)
    if (!session.completedAt) return
    await this.flush()
  }
  async flush() {
    const c = await this.client
    if (!navigator.onLine || !(await this.userId())) return
    const pending = (await this.local.getRecentSessions(100)).filter((s) => !(s as QuizSession & { synced?: boolean }).synced)
    for (const s of pending) {
      const { error } = await c.functions.invoke('submit-session', { body: s })
      if (!error) await this.local.saveSession({ ...s, synced: true } as QuizSession)
    }
  }
  getSession(id: string) {
    return this.local.getSession(id)
  }
  getOpenSessions() {
    return this.local.getOpenSessions()
  }
  getRecentSessions(limit: number) {
    return this.local.getRecentSessions(limit)
  }
  deleteSession(id: string) {
    return this.local.deleteSession(id)
  }
  async getAchievements() {
    const data = await this.ownRows('user_achievements', 'achievement_id, unlocked_at')
    if (!data) return this.local.getAchievements()
    return data.map((a) => ({ id: a.achievement_id, unlockedAt: a.unlocked_at }))
  }
  async unlockAchievement(id: string) {
    await this.local.unlockAchievement(id) // serverseitig via submit-session
  }
  async getQuests() {
    const data = await this.ownRows('user_quests', '*')
    if (!data) return this.local.getQuests()
    return data.map((q) => ({ id: q.quest_id, progress: q.progress, startedAt: q.started_at, completedAt: q.completed_at ?? undefined }))
  }
  async saveQuest(q: { id: string; progress: number; completedAt?: string; startedAt: string }) {
    await this.local.saveQuest(q)
  }
  async getFavorites() {
    const data = await this.ownRows('favorites', 'entity_id')
    if (!data) return this.local.getFavorites()
    return data.map((f) => f.entity_id)
  }
  async toggleFavorite(id: string) {
    const on = await this.local.toggleFavorite(id)
    const c = await this.client
    const uid = await this.userId()
    if (uid && navigator.onLine) {
      if (on) await c.from('favorites').upsert({ user_id: uid, entity_id: id })
      else await c.from('favorites').delete().eq('user_id', uid).eq('entity_id', id)
    }
    return on
  }
  getPuzzle(key: string) {
    return this.local.getPuzzle(key)
  }
  async savePuzzle(p: PuzzleResult) {
    await this.local.savePuzzle(p)
    const c = await this.client
    const uid = await this.userId()
    if (uid && navigator.onLine) await c.from('puzzle_results').upsert({ user_id: uid, key: p.key, puzzle: p.puzzle, date: p.date, guesses: p.guesses, solved: p.solved, finished_at: p.finishedAt ?? null })
  }
  getPuzzles() {
    return this.local.getPuzzles()
  }
  async getProfile() {
    const c = await this.client
    const uid = await this.userId()
    if (!uid || !navigator.onLine) return this.local.getProfile()
    const { data } = await c.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (!data) return undefined
    return { username: data.username ?? '', avatar: data.avatar, color: data.color, title: data.title ?? undefined, featuredAchievements: data.featured_achievements, favoriteCategory: data.favorite_category ?? undefined, createdAt: data.created_at }
  }
  async saveProfile(p: Profile) {
    await this.local.saveProfile(p)
    const c = await this.client
    const uid = await this.userId()
    if (uid && navigator.onLine)
      await c.from('profiles').update({ username: p.username || null, avatar: p.avatar, color: p.color, title: p.title ?? null, featured_achievements: p.featuredAchievements, favorite_category: p.favoriteCategory ?? null }).eq('id', uid)
  }
  exportAll() {
    return this.local.exportAll()
  }
  /** Gast → Account: Snapshot wird als Sessions eingereicht, der Server berechnet XP/Achievements neu (Anti-Cheat). */
  async importAll(snapshot: ProgressSnapshot, strategy: 'merge' | 'replace') {
    await this.local.importAll(snapshot, strategy)
    await this.flush()
  }
  clearAll() {
    return this.local.clearAll()
  }
}

/** Minimale Typen für den lazy geladenen Supabase-Client. */
interface SupabaseLike {
  auth: { getUser(): Promise<{ data: { user: { id: string } | null } }> }
  from(table: string): QueryLike
  functions: { invoke(name: string, opts: { body: unknown }): Promise<{ error: unknown }> }
}
interface QueryLike {
  select(cols: string): QueryLike
  eq(col: string, v: unknown): QueryLike
  range(from: number, to: number): QueryLike
  maybeSingle(): Promise<{ data: Record<string, never> | null }>
  upsert(v: unknown): Promise<unknown>
  update(v: unknown): QueryLike
  delete(): QueryLike
  then<T>(cb: (r: { data: Array<Record<string, never>> | null; error: unknown }) => T): Promise<T>
}
