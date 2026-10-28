import { describe, expect, it } from 'vitest'
import { STORY_CHAPTERS } from './chapters'
import {
  advanceStory,
  chapterStatus,
  currentChapterIndex,
  emptyStoryProgress,
  parseStoryProgress,
} from './storyProgress'

describe('Die Reise durch den Atlas der Winde', () => {
  it('öffnet nur das erste Kapitel und ignoriert Aktionen an verschlossenen Orten', () => {
    const progress = emptyStoryProgress()
    expect(chapterStatus(progress, 0)).toBe('available')
    expect(chapterStatus(progress, 1)).toBe('locked')
    expect(advanceStory(progress, { type: 'start', chapter: 4 })).toBe(progress)
    expect(advanceStory(progress, { type: 'collect', chapter: 0 })).toBe(progress)
    expect(advanceStory(progress, { type: 'start', chapter: -1 })).toBe(progress)
  })

  it('fordert die richtige Antwort in der richtigen Reihenfolge und zählt Doppelklicks einmal', () => {
    let progress = emptyStoryProgress()
    expect(advanceStory(progress, { type: 'solve', chapter: 0, task: 0, answer: 1 })).toBe(progress)
    progress = advanceStory(progress, { type: 'start', chapter: 0 })
    expect(advanceStory(progress, { type: 'solve', chapter: 0, task: 0, answer: 0 })).toBe(progress)
    expect(advanceStory(progress, { type: 'solve', chapter: 0, task: 1, answer: 0 })).toBe(progress)
    progress = advanceStory(progress, { type: 'solve', chapter: 0, task: 0, answer: 1 })
    expect(progress.chapters.ankunft.solved).toBe(1)
    expect(advanceStory(progress, { type: 'solve', chapter: 0, task: 0, answer: 1 })).toBe(progress)
    expect(chapterStatus(progress, 1)).toBe('locked')
  })

  it('schaltet nach dem Einsammeln frei und beendet alle acht Kapitel', () => {
    let progress = emptyStoryProgress()
    STORY_CHAPTERS.forEach((chapter, index) => {
      expect(currentChapterIndex(progress)).toBe(index)
      progress = advanceStory(progress, { type: 'start', chapter: index })
      chapter.tasks.forEach((task, taskIndex) => {
        progress = advanceStory(progress, {
          type: 'solve',
          chapter: index,
          task: taskIndex,
          answer: task.answer,
        })
      })
      if (index < 7) expect(chapterStatus(progress, index + 1)).toBe('locked')
      progress = advanceStory(progress, { type: 'collect', chapter: index })
      expect(chapterStatus(progress, index)).toBe('complete')
      expect(advanceStory(progress, { type: 'collect', chapter: index })).toBe(progress)
    })
    expect(currentChapterIndex(progress)).toBe(7)
    expect(parseStoryProgress(JSON.stringify(progress))).toEqual(progress)
  })

  it.each([null, '{', '[]', '{"version":2,"chapters":{}}', '{"version":1,"chapters":null}'])(
    'behandelt kaputte oder unbekannte Spielstände sicher: %s',
    (raw) => {
      expect(parseStoryProgress(raw)).toEqual(emptyStoryProgress())
    },
  )

  it('übernimmt keine übersprungenen Kapitel oder unverdienten Fundstücke', () => {
    const progress = parseStoryProgress(
      JSON.stringify({
        version: 1,
        chapters: {
          ankunft: { started: true, solved: '3', collected: true },
          kartenhaus: { started: true, solved: 3, collected: true },
        },
      }),
    )
    expect(progress.chapters.ankunft).toEqual({ started: true, solved: 0, collected: false })
    expect(progress.chapters.kartenhaus).toBeUndefined()
    expect(chapterStatus(progress, 1)).toBe('locked')
  })

  it('stellt ein begonnenes Kapitel zwischen zwei Aufgaben wieder her', () => {
    let progress = advanceStory(emptyStoryProgress(), { type: 'start', chapter: 0 })
    progress = advanceStory(progress, { type: 'solve', chapter: 0, task: 0, answer: 1 })
    expect(parseStoryProgress(JSON.stringify(progress))).toEqual(progress)
    expect(progress.chapters.ankunft.solved).toBe(1)
  })
})
