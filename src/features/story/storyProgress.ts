import { STORY_CHAPTERS } from './chapters'

export const STORY_STORAGE_KEY = 'atlasfunke.story.atlas-of-winds.v1'
export type ChapterProgress = { started: boolean; solved: number; collected: boolean }
export type StoryProgress = { version: 1; chapters: Record<string, ChapterProgress> }
export type ChapterStatus = 'locked' | 'available' | 'complete'

export function emptyStoryProgress(): StoryProgress {
  return { version: 1, chapters: {} }
}

/** Only a contiguous, validated journey can unlock later chapters. */
export function parseStoryProgress(raw: string | null): StoryProgress {
  const clean = emptyStoryProgress()
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    if (
      !value ||
      typeof value !== 'object' ||
      !('version' in value) ||
      value.version !== 1 ||
      !('chapters' in value) ||
      !value.chapters ||
      typeof value.chapters !== 'object'
    )
      return clean
    for (const chapter of STORY_CHAPTERS) {
      const saved: unknown = (value.chapters as Record<string, unknown>)[chapter.id]
      if (!saved || typeof saved !== 'object') break
      const entry = saved as Record<string, unknown>
      const started = entry.started === true
      const solved =
        started && Number.isInteger(entry.solved)
          ? Math.max(0, Math.min(chapter.tasks.length, entry.solved as number))
          : 0
      const collected = solved === chapter.tasks.length && entry.collected === true
      clean.chapters[chapter.id] = { started, solved, collected }
      if (!collected) break
    }
  } catch {
    /* A damaged save starts a fresh journey. */
  }
  return clean
}

export function chapterStatus(progress: StoryProgress, index: number): ChapterStatus {
  if (index < 0 || index >= STORY_CHAPTERS.length) return 'locked'
  if (index > 0 && !progress.chapters[STORY_CHAPTERS[index - 1].id]?.collected) return 'locked'
  return progress.chapters[STORY_CHAPTERS[index].id]?.collected ? 'complete' : 'available'
}

export function currentChapterIndex(progress: StoryProgress) {
  const index = STORY_CHAPTERS.findIndex((chapter) => !progress.chapters[chapter.id]?.collected)
  return index < 0 ? STORY_CHAPTERS.length - 1 : index
}

export type StoryAction =
  | { type: 'start'; chapter: number }
  | { type: 'solve'; chapter: number; task: number; answer: number }
  | { type: 'collect'; chapter: number }

export function advanceStory(progress: StoryProgress, action: StoryAction): StoryProgress {
  const chapter = STORY_CHAPTERS[action.chapter]
  if (!chapter || chapterStatus(progress, action.chapter) !== 'available') return progress
  const entry = progress.chapters[chapter.id] ?? { started: false, solved: 0, collected: false }
  let next = entry
  if (action.type === 'start' && !entry.started) next = { ...entry, started: true }
  if (
    action.type === 'solve' &&
    entry.started &&
    action.task === entry.solved &&
    chapter.tasks[action.task]?.answer === action.answer
  )
    next = { ...entry, solved: entry.solved + 1 }
  if (action.type === 'collect' && entry.solved === chapter.tasks.length) next = { ...entry, collected: true }
  return next === entry ? progress : { ...progress, chapters: { ...progress.chapters, [chapter.id]: next } }
}
