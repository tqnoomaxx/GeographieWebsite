import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Entity } from '@/domain/types'
import { hasMapGeometry } from '@/domain/mapFeatures'
import { STORY_LEVELS, STORY_LIVES } from './levels'
import {
  advanceStory,
  createLevelRun,
  currentLevelIndex,
  currentTask,
  earnedStars,
  emptyStoryProgress,
  isCorrectStoryAnswer,
  levelStatus,
  parseStoryProgress,
  runStars,
  type StoryProgress,
} from './levelProgress'

function unlock(index: number) {
  const progress = emptyStoryProgress()
  for (const level of STORY_LEVELS.slice(0, index)) progress.levels[level.id] = { stars: 3, attempts: 1 }
  return advanceStory(progress, { type: 'start', level: index })
}
function finish(progress: StoryProgress, index: number) {
  const level = STORY_LEVELS[index]
  while (progress.runs[level.id]?.status === 'playing') {
    const task = currentTask(level, progress.runs[level.id])!
    progress = advanceStory(progress, { type: 'answer', level: index, task: task.id, answer: task.answer })
    progress = advanceStory(progress, { type: 'next', level: index, task: task.id })
  }
  return progress
}
function runAt(index: number, mode: string) {
  const progress = unlock(index)
  const level = STORY_LEVELS[index]
  const run = progress.runs[level.id]
  const cursor = run.taskIds.findIndex((id) => level.tasks.find((task) => task.id === id)?.mode === mode)
  expect(cursor).toBeGreaterThanOrEqual(0)
  run.cursor = cursor
  return progress
}

describe('Acht zunehmend schwierige Story-Level', () => {
  it('hat acht eigene Welten und einen geprüften Pool mit 64 Aufgaben', () => {
    expect(STORY_LEVELS).toHaveLength(8)
    expect(new Set(STORY_LEVELS.map((level) => level.biome)).size).toBe(8)
    const tasks = STORY_LEVELS.flatMap((level) => level.tasks)
    expect(tasks).toHaveLength(64)
    expect(new Set(tasks.map((task) => task.id)).size).toBe(tasks.length)
    STORY_LEVELS.forEach((level, index) => {
      expect(level.tasks.length).toBeGreaterThan(level.taskCount)
      expect(level.tasks.filter((task) => task.required).length).toBeLessThanOrEqual(level.taskCount)
      if (index) {
        expect(level.difficulty).toBeGreaterThan(STORY_LEVELS[index - 1].difficulty)
        expect(level.taskCount).toBeGreaterThanOrEqual(STORY_LEVELS[index - 1].taskCount)
        expect(level.hintLimit).toBeLessThanOrEqual(STORY_LEVELS[index - 1].hintLimit)
      }
      for (const task of level.tasks) {
        expect(task.prompt && task.hint && task.explanation).toBeTruthy()
        expect(isCorrectStoryAnswer(task, task.answer)).toBe(true)
        if (task.mode === 'choice') {
          expect(task.choices).toContain(task.answer)
          expect(new Set(task.choices).size).toBe(task.choices.length)
        }
        if (task.mode === 'order') expect(new Set(task.answer).size).toBe(task.answer.length)
      }
    })
    expect(STORY_LEVELS[0].tasks.every((task) => task.mode === 'choice')).toBe(true)
    expect(STORY_LEVELS[7].tasks.every((task) => task.mode !== 'choice')).toBe(true)
    expect(STORY_LEVELS[7].hintLimit).toBe(0)
  })

  it('zeigt echte Flüsse und Gipfel und verwendet existierende Länder', () => {
    const countries = JSON.parse(readFileSync('public/data/entities/countries.json', 'utf8')) as Entity[]
    const nature = ['rivers', 'mountains'].flatMap(
      (kind) => JSON.parse(readFileSync(`public/data/entities/${kind}.json`, 'utf8')) as Entity[],
    )
    for (const task of STORY_LEVELS.flatMap((level) => level.tasks)) {
      if (task.mode === 'map') {
        expect(task.countries).toHaveLength(4)
        expect(task.countries).toContain(task.answer)
        expect(task.countries.every((id) => countries.some((country) => country.id === id))).toBe(true)
      }
      if (task.mode === 'features') {
        expect(task.features).toContain(task.answer)
        expect(
          task.features.every((id) => {
            const item = nature.find((entity) => entity.id === id)
            return item && hasMapGeometry(item)
          }),
        ).toBe(true)
      }
    }
  })

  it('schaltet nur der Reihe nach frei und benötigt eine bestätigte Lösung', () => {
    let progress = emptyStoryProgress()
    expect(levelStatus(progress, 0)).toBe('available')
    expect(levelStatus(progress, 1)).toBe('locked')
    expect(advanceStory(progress, { type: 'start', level: 1 })).toBe(progress)
    expect(advanceStory(progress, { type: 'retry', level: -1 })).toBe(progress)
    progress = advanceStory(progress, { type: 'start', level: 0 })
    const task = currentTask(STORY_LEVELS[0], progress.runs.ankunft)!
    expect(advanceStory(progress, { type: 'next', level: 0, task: task.id })).toBe(progress)
    expect(advanceStory(progress, { type: 'answer', level: 0, task: 'other', answer: task.answer })).toBe(
      progress,
    )
    expect(advanceStory(progress, { type: 'answer', level: 0, task: task.id, answer: '' })).toBe(progress)
    expect(
      advanceStory(progress, { type: 'answer', level: 0, task: task.id, answer: 'ungültige Auswahl' }),
    ).toBe(progress)
    expect(levelStatus(progress, 1)).toBe('locked')
  })

  it('beendet alle Level, erhält 24 Sterne und stellt den gesamten Fortschritt wieder her', () => {
    let progress = emptyStoryProgress()
    STORY_LEVELS.forEach((level, index) => {
      expect(currentLevelIndex(progress)).toBe(index)
      progress = advanceStory(progress, { type: 'start', level: index })
      progress = finish(progress, index)
      expect(progress.runs[level.id].status).toBe('cleared')
      expect(progress.levels[level.id].stars).toBe(3)
      expect(levelStatus(progress, index)).toBe('complete')
      expect(parseStoryProgress(JSON.stringify(progress))).toEqual(progress)
    })
    expect(earnedStars(progress)).toBe(24)
    expect(currentLevelIndex(progress)).toBe(7)
  })

  it('kostet pro unterschiedlicher falscher Antwort ein Herz und scheitert nach drei Fehlern', () => {
    let progress = runAt(3, 'input')
    const level = STORY_LEVELS[3]
    const task = currentTask(level, progress.runs[level.id])!
    for (let i = 1; i <= STORY_LIVES; i++) {
      progress = advanceStory(progress, {
        type: 'answer',
        level: 3,
        task: task.id,
        answer: `falscher Ort ${i}`,
      })
      expect(progress.runs[level.id].mistakes).toBe(i)
      expect(
        advanceStory(progress, { type: 'answer', level: 3, task: task.id, answer: `FALSCHER ORT ${i}` }),
      ).toBe(progress)
    }
    expect(progress.runs[level.id].status).toBe('failed')
    expect(advanceStory(progress, { type: 'answer', level: 3, task: task.id, answer: task.answer })).toBe(
      progress,
    )
    expect(levelStatus(progress, 4)).toBe('locked')
    expect(parseStoryProgress(JSON.stringify(progress))).toEqual(progress)
    const retry = advanceStory(progress, { type: 'retry', level: 3 })
    expect(retry.runs[level.id].mistakes).toBe(0)
    expect(retry.runs[level.id].attempt).toBe(2)
    expect(retry.runs[level.id].taskIds).not.toEqual(progress.runs[level.id].taskIds)
  })

  it('begrenzt Hinweise, verhindert mehrfache Nutzung und unterscheidet die Sterne', () => {
    let progress = unlock(0)
    for (let i = 0; i < 4; i++) {
      const task = currentTask(STORY_LEVELS[0], progress.runs.ankunft)!
      progress = advanceStory(progress, { type: 'hint', level: 0, task: task.id })
      expect(advanceStory(progress, { type: 'hint', level: 0, task: task.id })).toBe(progress)
      progress = advanceStory(progress, { type: 'answer', level: 0, task: task.id, answer: task.answer })
      expect(advanceStory(progress, { type: 'answer', level: 0, task: task.id, answer: task.answer })).toBe(
        progress,
      )
      progress = advanceStory(progress, { type: 'next', level: 0, task: task.id })
    }
    expect(progress.runs.ankunft.hints).toHaveLength(3)
    expect(progress.levels.ankunft.stars).toBe(1)
    const oneHint = unlock(0)
    const task = currentTask(STORY_LEVELS[0], oneHint.runs.ankunft)!
    const hinted = advanceStory(oneHint, { type: 'hint', level: 0, task: task.id })
    expect(finish(hinted, 0).levels.ankunft.stars).toBe(2)
    expect(runStars({ ...oneHint.runs.ankunft, mistakes: 2 })).toBe(1)
    const final = unlock(7)
    const finalTask = currentTask(STORY_LEVELS[7], final.runs.aufbruch)!
    expect(advanceStory(final, { type: 'hint', level: 7, task: finalTask.id })).toBe(final)
  })

  it('speichert Reihenfolgen, Hinweise und Fehler mitten im Level', () => {
    let progress = runAt(1, 'order')
    const task = currentTask(STORY_LEVELS[1], progress.runs.kartenhaus)!
    expect(task.mode).toBe('order')
    const previous = [...progress.runs.kartenhaus.orders[task.id]]
    progress = advanceStory(progress, { type: 'order', level: 1, task: task.id, from: 0, to: 1 })
    expect(progress.runs.kartenhaus.orders[task.id]).not.toEqual(previous)
    expect(advanceStory(progress, { type: 'order', level: 1, task: task.id, from: -1, to: 2 })).toBe(progress)
    progress = advanceStory(progress, { type: 'hint', level: 1, task: task.id })
    if (task.mode === 'order')
      progress = advanceStory(progress, {
        type: 'answer',
        level: 1,
        task: task.id,
        answer: [...task.answer].reverse(),
      })
    expect(parseStoryProgress(JSON.stringify(progress))).toEqual(progress)
    expect(advanceStory(progress, { type: 'start', level: 1 })).toBe(progress)
  })

  it('erhält Bestleistungen bei Wiederholungen und mischt nur gültige Aufgaben', () => {
    const cleared = finish(unlock(0), 0)
    const replay = advanceStory(cleared, { type: 'retry', level: 0 })
    expect(replay.levels.ankunft.stars).toBe(3)
    expect(replay.levels.ankunft.attempts).toBe(2)
    for (const level of STORY_LEVELS)
      for (let attempt = 1; attempt <= 8; attempt++) {
        const run = createLevelRun(level, attempt)
        expect(run.taskIds).toHaveLength(level.taskCount)
        expect(new Set(run.taskIds).size).toBe(level.taskCount)
        expect(
          level.tasks.filter((task) => task.required).every((task) => run.taskIds.includes(task.id)),
        ).toBe(true)
        for (const task of level.tasks)
          if (task.mode === 'order' && run.orders[task.id]) {
            expect(run.orders[task.id]).not.toEqual(task.answer)
            expect([...run.orders[task.id]].sort()).toEqual([...task.answer].sort())
          }
      }
  })

  it('akzeptiert Umschriften und Aliasse, aber keine fast richtige Höhenzahl', () => {
    for (const task of STORY_LEVELS.flatMap((level) => level.tasks))
      if (task.mode === 'input') {
        for (const accepted of task.accepted ?? []) expect(isCorrectStoryAnswer(task, accepted)).toBe(true)
      }
    const height = STORY_LEVELS[6].tasks.find((task) => task.id === 'summit-height-gain')!
    expect(isCorrectStoryAnswer(height, '1051')).toBe(false)
    expect(isCorrectStoryAnswer(height, '1050')).toBe(true)
  })

  it.each([
    null,
    '{',
    '[]',
    '{"version":2,"levels":null}',
    '{"version":77}',
    '{"version":1,"chapters":null}',
  ])('behandelt beschädigte Spielstände sicher: %s', (raw) => {
    expect(parseStoryProgress(raw)).toEqual(emptyStoryProgress())
  })

  it('verwirft ungültige Aufgaben und berechnet Feedback neu', () => {
    const progress = unlock(0)
    const run = progress.runs.ankunft
    const task = currentTask(STORY_LEVELS[0], run)!
    if (task.mode !== 'choice') throw new Error('Choice expected')
    run.feedback = {
      task: task.id,
      given: task.choices.find((answer) => answer !== task.answer)!,
      correct: true,
    }
    expect(parseStoryProgress(JSON.stringify(progress)).runs.ankunft.feedback?.correct).toBe(false)
    run.taskIds[0] = 'unknown'
    expect(parseStoryProgress(JSON.stringify(progress)).runs.ankunft).toBeUndefined()
    expect(levelStatus(parseStoryProgress(JSON.stringify(progress)), 1)).toBe('locked')
  })

  it('übernimmt nur zusammenhängend abgeschlossene alte Kapitel mit je einem Stern', () => {
    const chapters = Object.fromEntries(
      STORY_LEVELS.map((level) => [level.id, { started: true, solved: 3, collected: true }]),
    )
    const migrated = parseStoryProgress(JSON.stringify({ version: 1, chapters }))
    expect(earnedStars(migrated)).toBe(8)
    expect(Object.values(migrated.levels).every((level) => level.stars === 1 && level.migrated)).toBe(true)
    chapters.kartenhaus.collected = false
    const partial = parseStoryProgress(JSON.stringify({ version: 1, chapters }))
    expect(earnedStars(partial)).toBe(1)
    expect(levelStatus(partial, 1)).toBe('available')
    expect(levelStatus(partial, 2)).toBe('locked')
  })
})
