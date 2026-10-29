import { createRng } from '@/engine/rng'
import { matchesAnswer, matchesExactly, normalizeAnswer } from '@/engine/normalize'
import { STORY_LEVELS, STORY_LIVES, type StoryLevel, type StoryTask } from './levels'

export const STORY_STORAGE_KEY = 'atlasfunke.story.levels.v2'
export const LEGACY_STORY_KEY = 'atlasfunke.story.atlas-of-winds.v1'
export type LevelStatus = 'locked' | 'available' | 'complete'
export type StoryAnswer = string | string[]
export type LevelRecord = { stars: number; attempts: number; migrated?: boolean }
export type LevelRun = {
  attempt: number
  taskIds: string[]
  cursor: number
  mistakes: number
  hints: string[]
  rejected: Record<string, string[]>
  orders: Record<string, string[]>
  status: 'playing' | 'failed' | 'cleared'
  feedback?: { task: string; given: StoryAnswer; correct: boolean }
}
export type StoryProgress = {
  version: 2
  levels: Record<string, LevelRecord>
  runs: Record<string, LevelRun>
}
export type StoryAction =
  | { type: 'start'; level: number }
  | { type: 'retry'; level: number }
  | { type: 'answer'; level: number; task: string; answer: StoryAnswer }
  | { type: 'order'; level: number; task: string; from: number; to: number }
  | { type: 'hint' | 'next'; level: number; task: string }

export const emptyStoryProgress = (): StoryProgress => ({ version: 2, levels: {}, runs: {} })
export function levelStatus(progress: StoryProgress, index: number): LevelStatus {
  if (!STORY_LEVELS[index] || (index > 0 && !progress.levels[STORY_LEVELS[index - 1].id]?.stars))
    return 'locked'
  return progress.levels[STORY_LEVELS[index].id]?.stars ? 'complete' : 'available'
}
export function currentLevelIndex(progress: StoryProgress) {
  const index = STORY_LEVELS.findIndex((level) => !progress.levels[level.id]?.stars)
  return index < 0 ? STORY_LEVELS.length - 1 : index
}
export const earnedStars = (progress: StoryProgress) =>
  STORY_LEVELS.reduce((total, level) => total + (progress.levels[level.id]?.stars ?? 0), 0)
export const runStars = (run: LevelRun) =>
  run.mistakes === 0 && run.hints.length === 0 ? 3 : run.mistakes <= 1 && run.hints.length <= 1 ? 2 : 1
export const currentTask = (level: StoryLevel, run?: LevelRun) =>
  run ? level.tasks.find((task) => task.id === run.taskIds[run.cursor]) : undefined
const answerKey = (answer: StoryAnswer) =>
  Array.isArray(answer) ? JSON.stringify(answer) : normalizeAnswer(answer)

export function isCorrectStoryAnswer(task: StoryTask, answer: StoryAnswer) {
  if (task.mode === 'order')
    return (
      Array.isArray(answer) &&
      answer.length === task.answer.length &&
      answer.every((item, i) => item === task.answer[i])
    )
  if (typeof answer !== 'string') return false
  if (task.mode === 'input')
    return (task.strict ? matchesExactly : matchesAnswer)(answer, [task.answer, ...(task.accepted ?? [])])
  return task.answer === answer
}
function validAnswer(task: StoryTask, answer: unknown): answer is StoryAnswer {
  if (task.mode === 'order')
    return (
      Array.isArray(answer) &&
      answer.length === task.answer.length &&
      new Set(answer).size === answer.length &&
      answer.every((item) => typeof item === 'string' && task.answer.includes(item))
    )
  if (typeof answer !== 'string' || !answer.trim() || answer.length > 160) return false
  if (task.mode === 'choice') return task.choices.includes(answer)
  if (task.mode === 'map') return task.countries.includes(answer)
  if (task.mode === 'features') return task.features.includes(answer)
  return true
}

/** Every attempt contains its signature mechanics plus a fresh, deterministic task mix. */
export function createLevelRun(level: StoryLevel, attempt: number): LevelRun {
  const rng = createRng(`atlas-level-v2:${level.id}:${attempt}`)
  const required = level.tasks.filter((task) => task.required)
  const optional = rng
    .shuffle(level.tasks.filter((task) => !task.required))
    .slice(0, level.taskCount - required.length)
  const tasks = rng.shuffle([...required, ...optional])
  const orders: Record<string, string[]> = {}
  for (const task of tasks)
    if (task.mode === 'order') {
      const shuffled = rng.shuffle(task.answer)
      orders[task.id] = shuffled.every((item, i) => item === task.answer[i])
        ? [...shuffled.slice(1), shuffled[0]]
        : shuffled
    }
  return {
    attempt,
    taskIds: tasks.map((task) => task.id),
    cursor: 0,
    mistakes: 0,
    hints: [],
    rejected: {},
    orders,
    status: 'playing',
  }
}

export function advanceStory(progress: StoryProgress, action: StoryAction): StoryProgress {
  const level = STORY_LEVELS[action.level]
  if (!level || levelStatus(progress, action.level) === 'locked') return progress
  const previous = progress.runs[level.id]
  if (action.type === 'start' || action.type === 'retry') {
    if (action.type === 'start' && previous?.status === 'playing') return progress
    const record = progress.levels[level.id] ?? { stars: 0, attempts: 0 }
    const attempt = record.attempts + 1
    return {
      ...progress,
      levels: { ...progress.levels, [level.id]: { ...record, attempts: attempt } },
      runs: { ...progress.runs, [level.id]: createLevelRun(level, attempt) },
    }
  }
  if (!previous || previous.status !== 'playing') return progress
  const task = currentTask(level, previous)
  if (!task || action.task !== task.id) return progress
  let run = previous
  let levels = progress.levels
  if (action.type === 'answer') {
    if (previous.feedback?.correct || !validAnswer(task, action.answer)) return progress
    const correct = isCorrectStoryAnswer(task, action.answer)
    const key = answerKey(action.answer)
    if (!correct && previous.rejected[task.id]?.includes(key)) return progress
    const mistakes = previous.mistakes + (correct ? 0 : 1)
    run = {
      ...previous,
      mistakes,
      status: mistakes >= STORY_LIVES ? 'failed' : 'playing',
      feedback: { task: task.id, given: action.answer, correct },
      rejected: correct
        ? previous.rejected
        : { ...previous.rejected, [task.id]: [...(previous.rejected[task.id] ?? []), key] },
    }
  }
  if (action.type === 'hint') {
    if (
      previous.feedback?.correct ||
      previous.hints.includes(task.id) ||
      previous.hints.length >= level.hintLimit
    )
      return progress
    run = { ...previous, hints: [...previous.hints, task.id] }
  }
  if (action.type === 'order') {
    if (task.mode !== 'order' || previous.feedback?.correct) return progress
    const items = previous.orders[task.id]
    if (
      !items ||
      !Number.isInteger(action.from) ||
      !Number.isInteger(action.to) ||
      action.from === action.to ||
      action.from < 0 ||
      action.to < 0 ||
      action.from >= items.length ||
      action.to >= items.length
    )
      return progress
    const next = [...items]
    const [item] = next.splice(action.from, 1)
    next.splice(action.to, 0, item)
    run = { ...previous, feedback: undefined, orders: { ...previous.orders, [task.id]: next } }
  }
  if (action.type === 'next') {
    if (!previous.feedback?.correct) return progress
    const cursor = previous.cursor + 1
    run = {
      ...previous,
      cursor,
      feedback: undefined,
      status: cursor === previous.taskIds.length ? 'cleared' : 'playing',
    }
    if (run.status === 'cleared') {
      const record = progress.levels[level.id]
      levels = {
        ...levels,
        [level.id]: {
          stars: Math.max(record?.stars ?? 0, runStars(run)),
          attempts: record?.attempts ?? run.attempt,
        },
      }
    }
  }
  return run === previous ? progress : { ...progress, levels, runs: { ...progress.runs, [level.id]: run } }
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const integer = (value: unknown, fallback = 0) =>
  Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : fallback

/** Parse only known levels, valid task IDs and well-formed drafts; a broken run cannot unlock a level. */
export function parseStoryProgress(raw: string | null): StoryProgress {
  const clean = emptyStoryProgress()
  try {
    const saved: unknown = JSON.parse(raw ?? 'null')
    if (!record(saved)) return clean
    if (saved.version === 1 && record(saved.chapters)) {
      for (const level of STORY_LEVELS) {
        const old = saved.chapters[level.id]
        if (!record(old) || old.started !== true || old.solved !== 3 || old.collected !== true) break
        clean.levels[level.id] = { stars: 1, attempts: 0, migrated: true }
      }
      return clean
    }
    if (saved.version !== 2 || !record(saved.levels) || !record(saved.runs)) return clean
    for (const level of STORY_LEVELS) {
      const previous = saved.levels[level.id]
      if (!record(previous)) break
      const stars = Math.min(3, integer(previous.stars))
      clean.levels[level.id] = {
        stars,
        attempts: Math.min(1_000_000, integer(previous.attempts)),
        ...(previous.migrated === true ? { migrated: true } : {}),
      }
      if (!stars) break
    }
    for (let i = 0; i < STORY_LEVELS.length; i++) {
      const level = STORY_LEVELS[i]
      const value = saved.runs[level.id]
      if (levelStatus(clean, i) === 'locked' || !record(value)) continue
      const ids = value.taskIds
      if (
        !Array.isArray(ids) ||
        ids.length !== level.taskCount ||
        new Set(ids).size !== ids.length ||
        !ids.every((id) => typeof id === 'string' && level.tasks.some((task) => task.id === id)) ||
        !level.tasks.filter((task) => task.required).every((task) => ids.includes(task.id))
      )
        continue
      const attempt = Math.max(1, integer(value.attempt, 1))
      const run = createLevelRun(level, attempt)
      run.taskIds = ids as string[]
      run.cursor = Math.min(ids.length - 1, integer(value.cursor))
      run.mistakes = Math.min(STORY_LIVES, integer(value.mistakes))
      run.status = run.mistakes === STORY_LIVES ? 'failed' : 'playing'
      if (value.status === 'cleared' && value.cursor === ids.length && clean.levels[level.id]?.stars) {
        run.cursor = ids.length
        run.status = 'cleared'
      }
      run.hints = Array.isArray(value.hints)
        ? [
            ...new Set(value.hints.filter((id): id is string => typeof id === 'string' && ids.includes(id))),
          ].slice(0, level.hintLimit)
        : []
      run.rejected = {}
      for (const id of ids as string[]) {
        if (record(value.rejected) && Array.isArray(value.rejected[id]))
          run.rejected[id] = value.rejected[id]
            .filter((answer): answer is string => typeof answer === 'string' && answer.length <= 500)
            .slice(0, STORY_LIVES)
        const task = level.tasks.find((entry) => entry.id === id)!
        if (task.mode === 'order') {
          const draft = record(value.orders) ? value.orders[id] : undefined
          run.orders[id] = validAnswer(task, draft)
            ? (draft as string[])
            : (createLevelRun(level, attempt).orders[id] ?? [...task.answer].reverse())
        }
      }
      const task = currentTask(level, run)
      if (
        task &&
        record(value.feedback) &&
        value.feedback.task === task.id &&
        validAnswer(task, value.feedback.given)
      )
        run.feedback = {
          task: task.id,
          given: value.feedback.given,
          correct: isCorrectStoryAnswer(task, value.feedback.given),
        }
      clean.runs[level.id] = run
      const entry = clean.levels[level.id] ?? { stars: 0, attempts: 0 }
      clean.levels[level.id] = { ...entry, attempts: Math.max(entry.attempts, attempt) }
    }
  } catch {
    /* Keep the valid part of a damaged save, or start clean. */
  }
  return clean
}
