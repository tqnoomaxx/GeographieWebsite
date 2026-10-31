import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import courses from '@/config/languageCourses.json'
import { buildContext } from './context'
import { buildSession, checkAnswer, extendSession, poolFor } from './session'
import { fromQuery, toQuery, type RoundConfig } from './round'
import { normalizeAnswer } from './normalize'
import type { Entity } from '@/domain/types'

const cards: Entity[] = JSON.parse(readFileSync('public/data/entities/language-courses.json', 'utf8'))
const ctx = buildContext({
  countries: [],
  cities: [],
  landmarks: [],
  regions: [],
  relationships: [],
  courseCards: cards,
  scope: 'world',
})
describe('Sprachkurse für jede vorhandene Sprache', () => {
  it('bietet alle 21 Sprachen mit mindestens 200 echten Wörtern, fünf Themen und Schriftgrundlagen', () => {
    expect(courses).toHaveLength(21)
    expect(new Set(cards.map((e) => e.id)).size).toBe(cards.length)
    for (const course of courses) {
      const words = cards.filter((e) => e.attributes.language === course.code && e.attributes.kind === 'word')
      expect(words.length).toBe(course.words)
      expect(words.length).toBeGreaterThanOrEqual(200)
      expect(new Set(words.map((e) => e.attributes.original)).size).toBe(words.length)
      expect(new Set(words.map((e) => e.attributes.topic)).size).toBe(5)
      expect(
        words.every((e) => e.attributes.meaning && e.provenance.source_url && e.provenance.license),
      ).toBe(true)
    }
  })
  for (const course of courses)
    for (const collection of ['alphabet', 'words'])
      for (const mode of ['choice', 'input']) {
        it(`${course.name} / ${collection} / ${mode}: nur passende Karten, gültige Antworten, persistenter Modus`, () => {
          const setup: RoundConfig = {
            category: 'languages',
            exercise: `learn-${course.code}`,
            collection,
            mode,
            scope: 'world',
            length: 10,
            repeat: true,
          }
          expect(fromQuery('languages', new URLSearchParams(toQuery(setup)))).toMatchObject(setup)
          const pool = poolFor(ctx, setup)
          expect(pool.size).toBe(collection === 'words' ? course.words : course.letters)
          expect(
            [...pool.values()].every(
              ({ entity }) =>
                entity.attributes.language === course.code &&
                entity.attributes.kind === (collection === 'words' ? 'word' : 'letter'),
            ),
          ).toBe(true)
          const session = buildSession(ctx, setup, { seed: 'course' })
          expect(session.questions).toHaveLength(10)
          for (const { question } of session.questions) {
            expect(checkAnswer(question, question.answer, ctx)).toBe(true)
            if (mode === 'choice') {
              expect(question.options).toHaveLength(4)
              expect(new Set(question.options!.map((option) => normalizeAnswer(option.label))).size).toBe(4)
            } else {
              expect(question.accepted?.length).toBeGreaterThan(0)
              expect(checkAnswer(question, 'garantiert falsche antwort', ctx)).toBe(false)
            }
          }
        })
      }
  it('hält einen ausgewählten Themenbereich über only bei Rundenaufbau fest', () => {
    const only = cards
      .filter((e) => e.attributes.language === 'ar' && e.attributes.topic === 'Unterwegs')
      .map((e) => e.id)
    let session = buildSession(
      ctx,
      {
        category: 'languages',
        exercise: 'learn-ar',
        collection: 'words',
        mode: 'choice',
        scope: 'world',
        length: 'all',
        repeat: false,
        only,
      },
      { seed: 'topic' },
    )
    while (session.remaining?.length) session = extendSession(session, ctx)
    expect(session.questions).toHaveLength(only.length)
    expect(session.questions.every((item) => only.includes(item.question.entities[0]))).toBe(true)
  })
})
