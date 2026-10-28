import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { Entity } from '@/domain/types'
import { buildContext } from './context'
import { acceptProfileInput, advanceSession, buildSession, poolFor, recordAnswer } from './session'
import {
  DEFAULT_PROFILE_FIELDS,
  profileHasLongerMatch,
  profileHit,
  profileHits,
  selectedProfileIds,
} from './profile'
import { fromQuery, toQuery, type RoundConfig } from './round'

const read = (file: string): Entity[] => JSON.parse(readFileSync(`public/data/entities/${file}.json`, 'utf8'))
const context = buildContext({
  countries: read('countries'),
  cities: read('cities'),
  mountains: read('mountains'),
  relationships: [],
  regions: [],
  landmarks: [],
  scope: 'world',
})
const setup = (fields: string[], extra: Partial<RoundConfig> = {}): RoundConfig => ({
  category: 'countries',
  exercise: 'country-profile',
  mode: 'input',
  scope: 'world',
  length: 10,
  repeat: false,
  fields,
  ...extra,
})
const round = (iso: string, fields: string[], learning = false) =>
  buildSession(context, setup(fields, { only: [`country:${iso}`], repeat: learning }), { seed: iso })

describe('Erweiterte Länderprofile', () => {
  it('akzeptiert beliebig viele bekannte Kategorien und entfernt ungültige / doppelte Einträge', () => {
    expect(selectedProfileIds(['highest_point'])).toEqual(['highest_point'])
    expect(selectedProfileIds(['capital', 'capital', 'invalid', 'neighbors'])).toEqual([
      'capital',
      'neighbors',
    ])
    expect(selectedProfileIds([])).toEqual(DEFAULT_PROFILE_FIELDS)
  })

  it('fragt die höchste Erhebung nach Namen ab und zeigt ihre Höhe mit an', () => {
    let session = round('DE', ['highest_point', 'capital', 'neighbors', 'iso3', 'subregion', 'language'])
    expect(session.questions[0].question.profileFields).toHaveLength(6)
    expect(
      session.questions[0].question.profileFields?.find((field) => field.id === 'highest_point')?.display,
    ).toBe('Zugspitze · 2.962 m')
    session = acceptProfileInput(session, 'Zugspitze')
    expect(session.questions[0].profileAnswers?.highest_point).toBe('Zugspitze')
    expect(acceptProfileInput(session, '2962')).toBe(session)
  })

  it('zeigt mehrere Hauptstädte / Sprachen / Nachbarn vollständig und akzeptiert jeweils einen Treffer', () => {
    const za = round('ZA', ['capital', 'language']).questions[0].question.profileFields!
    expect(za.find((field) => field.id === 'capital')?.display).toMatch(/Pretoria.*Kapstadt.*Bloemfontein/)
    expect(za.find((field) => field.id === 'language')?.display).toContain('Afrikaans')
    const ch = round('CH', ['language', 'neighbors']).questions[0].question.profileFields!
    expect(ch[0].display).toMatch(/Französisch.*Deutsch.*Italienisch.*Bündnerromanisch/)
    expect(ch[1].display).toContain('Liechtenstein')
    let session = round('CH', ['language', 'neighbors'])
    session = acceptProfileInput(session, 'Deutsch')
    session = acceptProfileInput(session, 'Österreich')
    expect(session.questions[0].correct).toBe(true)
  })

  it('bietet nur Länder mit Angaben zu allen gewählten Kategorien an und behandelt Inselstaaten', () => {
    const pool = poolFor(context, setup(['national_tree', 'highest_point']))
    expect(pool.has('country:ZA')).toBe(true)
    expect(pool.has('country:DE')).toBe(false)
    expect(pool.size).toBeGreaterThan(0)
    const session = acceptProfileInput(round('AU', ['neighbors']), 'keine')
    expect(session.questions[0].correct).toBe(true)
    expect(session.questions[0].question.profileFields?.[0].display).toBe('Keine Landnachbarn')
  })

  it('löst mehrdeutige Antworten nur nach expliziter Zuordnung auf und erkennt längere Wörter', () => {
    let session = round('BR', ['continent', 'subregion'])
    const fields = session.questions[0].question.profileFields!
    expect(profileHits(fields, {}, 'Südamerika')).toHaveLength(2)
    expect(profileHit(fields, {}, 'Südamerika')).toBeUndefined()
    expect(acceptProfileInput(session, 'Südamerika')).toBe(session)
    session = acceptProfileInput(session, 'Südamerika', 'continent')
    expect(session.questions[0].profileAnswers).toEqual({ continent: 'Südamerika' })
    expect(acceptProfileInput(session, 'Südamerika', 'capital')).toBe(session)
    session = acceptProfileInput(session, 'Südamerika', 'subregion')
    expect(session.questions[0].correct).toBe(true)
    const germanFields = round('DE', ['iso2', 'language']).questions[0].question.profileFields!
    expect(profileHasLongerMatch(germanFields, {}, 'DE')).toBe(true)
    expect(profileHasLongerMatch(germanFields, {}, 'Deutsch')).toBe(false)
  })

  it('erhält Kategorien und Lernmodus in der URL; ein altes Profil startet ohne automatische Wiederholung', () => {
    const config = setup(['highest_point', 'neighbors', 'iso3'], { repeat: true, length: 'all' })
    expect(fromQuery('countries', new URLSearchParams(toQuery(config)))).toMatchObject(config)
    expect(toQuery(config)).toContain('repeat=1')
    expect(fromQuery('countries', new URLSearchParams('quiz=country-profile&mode=input'))).toMatchObject({
      repeat: false,
      fields: DEFAULT_PROFILE_FIELDS,
    })
  })
})

describe('Wiederholungslernen für fehlende Profilfelder', () => {
  it('fragt nur ungelöste Felder erneut, wiederholt sie bei Bedarf mehrfach und endet nach dem Lösen', () => {
    let session = round('DE', ['capital', 'highest_point', 'iso3'], true)
    session = acceptProfileInput(session, 'Berlin')
    session = recordAnswer(session, '__skip__')
    expect(session.questions).toHaveLength(2)
    expect(session.questions[1].question.profileFields?.map((field) => field.id)).toEqual([
      'highest_point',
      'iso3',
    ])
    expect(session.questions[1].profileAnswers).toBeUndefined()
    session = advanceSession(session, context)!
    session = acceptProfileInput(session, 'Zugspitze')
    session = recordAnswer(session, '__skip__')
    expect(session.questions[2].question.profileFields?.map((field) => field.id)).toEqual(['iso3'])
    const saved = JSON.parse(JSON.stringify(session))
    session = advanceSession(saved, context)!
    session = acceptProfileInput(session, 'DEU')
    expect(session.questions[2].correct).toBe(true)
    expect(session.questions).toHaveLength(3)
    expect(advanceSession(session, context)).toBeNull()
    expect(session.questions[0].correct).toBe(false)
  })

  it('reiht Wiederholungen nach drei weiteren Ländern ein und verhindert doppelte Antworten', () => {
    let session = buildSession(context, setup(['capital', 'highest_point'], { repeat: true }), {
      seed: 'spaced',
    })
    const id = session.questions[0].question.entities[0]
    session = recordAnswer(session, '__skip__')
    expect(session.questions[4].question.entities[0]).toBe(id)
    expect(session.questions[4].repeated).toBe(true)
    expect(recordAnswer(session, '__skip__')).toBe(session)
  })

  it('erstellt im Testmodus und bei selbst gelösten Profilen keine Wiederholungen', () => {
    let session = recordAnswer(round('DE', ['highest_point']), '__skip__')
    expect(session.questions).toHaveLength(1)
    session = acceptProfileInput(round('DE', ['highest_point'], true), 'Zugspitze')
    expect(session.questions).toHaveLength(1)
    expect(session.questions[0].correct).toBe(true)
  })
})
