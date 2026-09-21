import { XP } from '@/config/xp'
import { ACHIEVEMENTS, type AchievementDef } from '@/config/achievements'
import { QUESTS, type QuestDef } from '@/config/quests'
import { levelForXp } from '@/config/levels'
import type { ProgressRepository, UserStats } from '@/services/progress/types'
import type { QuizSession } from '@/engine/session'
import type { Entity } from '@/domain/types'
import { review, initialProgress, type EntityProgress } from '@/engine/srs'
import { todayKey } from '@/engine/rng'

export interface RoundOutcome {
  xp: number
  correct: number
  total: number
  newAchievements: AchievementDef[]
  completedQuests: QuestDef[]
  levelUp?: number
  wrongEntities: string[]
}

/** Wertet eine abgeschlossene Runde aus: XP, SRS-Fortschritt, Statistik, Streak, Achievements, Quests. */
export async function applySession(repo: ProgressRepository, session: QuizSession, byId: Map<string, Entity>): Promise<RoundOutcome> {
  const stats = await repo.getStats()
  const before = levelForXp(stats.xp).level
  let xp = 0
  let correct = 0
  const progressMap = await repo.getAllEntityProgress()
  const touched = new Map<string, EntityProgress>()
  const wrongEntities: string[] = []
  const answered = session.questions.filter((q) => q.given !== undefined)
  const baseAnswered = answered.filter((q) => !q.repeated)
  // Wiederholungen sind Lernfeedback, keine zusätzlichen Statistikfragen. Für eine gelöste
  // Wiederholung gibt es weiterhin die kleine Versuchs-XP, aber keinen zweiten SRS-Eintrag.
  xp += answered.filter((q) => q.repeated && q.correct).length * XP.wrong_answer
  for (const q of baseAnswered) {
    const ok = !!q.correct
    if (ok) {
      correct++
      xp += XP.correct_answer + (XP.difficulty_bonus[q.question.difficulty] ?? 0)
    } else {
      xp += XP.wrong_answer
      wrongEntities.push(q.question.entities[0])
    }
    const primary = q.question.entities[0]
    const cur = touched.get(primary) ?? progressMap.get(primary) ?? initialProgress(primary)
    if (cur.correct + cur.wrong === 0) xp += XP.new_entity_seen
    touched.set(primary, review(cur, ok))
    const cat = (stats.byCategory[q.question.category] ??= { answered: 0, correct: 0 })
    cat.answered++
    if (ok) cat.correct++
    const continent = byId.get(primary)?.attributes.continent ?? byId.get(byId.get(primary)?.attributes.country ?? '')?.attributes.continent
    if (continent && !stats.continentsPlayed.includes(continent)) stats.continentsPlayed.push(continent)
  }
  if (session.completedAt) {
    xp += XP.quiz_completed
    stats.sessions++
    if (session.mode === 'full') {
      xp += XP.full_run_completed
      if (wrongEntities.length === 0) stats.fullRuns++
    }
  }
  stats.answered += baseAnswered.length
  stats.correct += correct
  stats.xp += xp
  touchStreak(stats)
  await repo.saveEntityProgress([...touched.values()])
  for (const [id, p] of touched) progressMap.set(id, p)
  const mastered = [...progressMap.values()].filter((p) => p.state === 'mastered').length
  const newAchievements = await evaluateAchievements(repo, stats, mastered)
  stats.xp += newAchievements.length * XP.achievement
  const completedQuests = await advanceQuests(repo, stats, session, baseAnswered.length)
  stats.xp += completedQuests.reduce((s, q) => s + q.reward_xp, 0)
  await repo.saveStats(stats)
  const after = levelForXp(stats.xp).level
  return { xp, correct, total: baseAnswered.length, newAchievements, completedQuests, levelUp: after > before ? after : undefined, wrongEntities }
}

export function touchStreak(stats: UserStats, today = todayKey()) {
  const last = stats.streak.lastActive
  if (last === today) return
  const yesterday = todayKey(new Date(Date.now() - 86_400_000))
  stats.streak.current = last === yesterday ? stats.streak.current + 1 : 1
  stats.streak.best = Math.max(stats.streak.best, stats.streak.current)
  stats.streak.lastActive = today
}

export async function evaluateAchievements(repo: ProgressRepository, stats: UserStats, mastered: number): Promise<AchievementDef[]> {
  const unlocked = new Set((await repo.getAchievements()).map((a) => a.id))
  const fresh: AchievementDef[] = []
  for (const a of ACHIEVEMENTS) {
    if (unlocked.has(a.id)) continue
    const value = metric(a, stats, mastered)
    if (value >= a.threshold) {
      await repo.unlockAchievement(a.id)
      fresh.push(a)
    }
  }
  return fresh
}

export function metric(a: AchievementDef, stats: UserStats, mastered: number): number {
  switch (a.type) {
    case 'correct_answers':
      return a.category ? (stats.byCategory[a.category]?.correct ?? 0) : stats.correct
    case 'entities_mastered':
      return mastered
    case 'sessions_completed':
      return stats.sessions
    case 'continents_played':
      return stats.continentsPlayed.length
    case 'full_runs':
      return stats.fullRuns
    case 'puzzles_solved':
      return stats.puzzlesSolved
    case 'streak_days':
      return stats.streak.best
    case 'level':
      return levelForXp(stats.xp).level
  }
}

async function advanceQuests(repo: ProgressRepository, stats: UserStats, session: QuizSession, answeredCount: number): Promise<QuestDef[]> {
  const state = new Map((await repo.getQuests()).map((q) => [q.id, q]))
  const done: QuestDef[] = []
  for (const def of QUESTS) {
    const cur = state.get(def.id) ?? { id: def.id, progress: 0, startedAt: new Date().toISOString() }
    if (cur.completedAt) continue
    let inc = 0
    if (def.type === 'answer_questions' && (!def.category || def.category === session.category)) inc = session.questions.filter((q) => !q.repeated && q.correct).length
    if (def.type === 'complete_sessions' && session.completedAt) inc = 1
    if (def.type === 'learn_entities' && def.scope) {
      // Fortschritt = Anzahl gelernter (familiar/mastered) Entities im Bereich; wird in recomputeLongQuests gesetzt
      continue
    }
    if (!inc) continue
    cur.progress = Math.min(def.target, cur.progress + inc)
    if (cur.progress >= def.target) {
      cur.completedAt = new Date().toISOString()
      done.push(def)
    }
    await repo.saveQuest(cur)
  }
  void answeredCount
  void stats
  return done
}

/** Langzeitquests aus dem Lernstand ableiten (Anzahl familiar/mastered Länder im Bereich). */
export async function recomputeLongQuests(repo: ProgressRepository, byId: Map<string, Entity>): Promise<QuestDef[]> {
  const progress = await repo.getAllEntityProgress()
  const state = new Map((await repo.getQuests()).map((q) => [q.id, q]))
  const done: QuestDef[] = []
  for (const def of QUESTS.filter((q) => q.type === 'learn_entities' && q.scope)) {
    const cur = state.get(def.id) ?? { id: def.id, progress: 0, startedAt: new Date().toISOString() }
    if (cur.completedAt) continue
    let count = 0
    for (const p of progress.values()) {
      if (p.state !== 'familiar' && p.state !== 'mastered') continue
      const e = byId.get(p.entityId)
      if (!e) continue
      const scope = def.scope!
      const matches =
        scope === 'americas'
          ? e.type === 'country' && (e.attributes.continent === 'north-america' || e.attributes.continent === 'south-america')
          : scope.startsWith('country:')
            ? e.attributes.country === scope
            : e.type === 'country' && e.attributes.continent === scope
      if (matches) count++
    }
    cur.progress = Math.min(def.target, count)
    if (cur.progress >= def.target) {
      cur.completedAt = new Date().toISOString()
      done.push(def)
    }
    await repo.saveQuest(cur)
  }
  if (done.length) {
    const stats = await repo.getStats()
    stats.xp += done.reduce((s, q) => s + q.reward_xp, 0)
    await repo.saveStats(stats)
  }
  return done
}

export async function applyPuzzleSolved(repo: ProgressRepository, attempts: number, solved: boolean): Promise<{ xp: number; newAchievements: AchievementDef[] }> {
  const stats = await repo.getStats()
  let xp = 0
  if (solved) {
    xp = XP.puzzle_solved_by_attempt[Math.min(attempts, XP.puzzle_solved_by_attempt.length) - 1] ?? 10
    stats.puzzlesSolved++
  }
  stats.xp += xp
  touchStreak(stats)
  const mastered = [...(await repo.getAllEntityProgress()).values()].filter((p) => p.state === 'mastered').length
  const newAchievements = await evaluateAchievements(repo, stats, mastered)
  stats.xp += newAchievements.length * XP.achievement
  await repo.saveStats(stats)
  return { xp, newAchievements }
}

export async function applyLearned(repo: ProgressRepository, entityId: string): Promise<void> {
  const stats = await repo.getStats()
  const cur = (await repo.getEntityProgress(entityId)) ?? initialProgress(entityId)
  await repo.saveEntityProgress([review(cur, true)])
  stats.learned++
  stats.xp += XP.learned_flashcard
  touchStreak(stats)
  const state = new Map((await repo.getQuests()).map((q) => [q.id, q]))
  for (const def of QUESTS.filter((q) => q.type === 'learn_entities' && !q.scope)) {
    const q = state.get(def.id) ?? { id: def.id, progress: 0, startedAt: new Date().toISOString() }
    if (q.completedAt) continue
    q.progress = Math.min(def.target, q.progress + 1)
    if (q.progress >= def.target) {
      q.completedAt = new Date().toISOString()
      stats.xp += def.reward_xp
    }
    await repo.saveQuest(q)
  }
  await repo.saveStats(stats)
}
