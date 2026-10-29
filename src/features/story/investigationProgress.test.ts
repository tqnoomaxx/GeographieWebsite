import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { geoContains } from 'd3-geo'
import { INVESTIGATIONS } from './investigations'
import {
  advanceInvestigation,
  caseAvailable,
  caseRating,
  emptyInvestigationProgress,
  evaluateInvestigation,
  newInvestigationRun,
  numericValue,
  parseInvestigationProgress,
  type InvestigationProgress,
  type MapData,
} from './investigationProgress'

const mapFor = (index: number) =>
  JSON.parse(readFileSync(`public/data/story/${INVESTIGATIONS[index].map}.geojson`, 'utf8')) as MapData
function prepare(progress: InvestigationProgress, index: number) {
  const file = INVESTIGATIONS[index]
  progress = advanceInvestigation(progress, { type: 'start', caseId: file.id })
  for (const target of file.targets)
    progress = advanceInvestigation(progress, {
      type: 'pin',
      caseId: file.id,
      target: target.id,
      point: target.location,
    })
  for (const id of file.proof)
    progress = advanceInvestigation(progress, { type: 'proof', caseId: file.id, evidence: id })
  if (file.reject)
    progress = advanceInvestigation(progress, { type: 'reject', caseId: file.id, evidence: file.reject.id })
  if (file.calculation)
    progress = advanceInvestigation(progress, {
      type: 'calculation',
      caseId: file.id,
      value: String(file.calculation.answer),
    })
  return progress
}
const submit = (progress: InvestigationProgress, index: number) =>
  advanceInvestigation(progress, { type: 'submit', caseId: INVESTIGATIONS[index].id, map: mapFor(index) })

describe('Geografische Ermittlungen', () => {
  it('hat acht eigenständige Fälle mit Karten, belastbaren Belegen und begründeten Gegenprüfungen', () => {
    expect(INVESTIGATIONS).toHaveLength(8)
    expect(new Set(INVESTIGATIONS.map((file) => file.id)).size).toBe(8)
    expect(new Set(INVESTIGATIONS.map((file) => file.theme)).size).toBe(8)
    for (const [index, file] of INVESTIGATIONS.entries()) {
      const ids = new Set(file.evidence.map((item) => item.id))
      expect(ids.size).toBe(file.evidence.length)
      expect(file.proof).toHaveLength(2)
      expect(file.proof.every((id) => ids.has(id))).toBe(true)
      expect(file.proof).not.toContain(file.reject?.id)
      expect(ids.has(file.reject!.id)).toBe(true)
      expect(file.hints).toHaveLength(3)
      expect(file.sources.length).toBeGreaterThan(0)
      const map = mapFor(index)
      expect(map.features.some((feature) => feature.properties.kind === 'land')).toBe(true)
      for (const target of file.targets) {
        expect(target.location.lon).toBeGreaterThanOrEqual(file.bounds[0])
        expect(target.location.lon).toBeLessThanOrEqual(file.bounds[2])
        expect(target.location.lat).toBeGreaterThanOrEqual(file.bounds[1])
        expect(target.location.lat).toBeLessThanOrEqual(file.bounds[3])
        if (target.feature)
          expect(
            geoContains(
              map.features.find((feature) => feature.properties.id === target.feature)!,
              [target.location.lon, target.location.lat],
            ),
          ).toBe(true)
      }
    }
  })
  it('spielt die gesamte Kampagne mit echten Kartendaten bis zum Finale durch', () => {
    let progress = emptyInvestigationProgress()
    for (let index = 0; index < 8; index++) {
      const file = INVESTIGATIONS[index]
      expect(caseAvailable(progress, file.id)).toBe(true)
      if (index < 7) expect(caseAvailable(progress, INVESTIGATIONS[index + 1].id)).toBe(false)
      progress = submit(prepare(progress, index), index)
      expect(progress.cases[file.id].solved).toBe(true)
      expect(progress.cases[file.id].feedback?.checks.every((check) => check.correct)).toBe(true)
      expect(progress.best[file.id]).toBe(3)
      progress = parseInvestigationProgress(JSON.stringify(progress))
      expect(progress.cleared).toHaveLength(index + 1)
      expect(progress.cases[file.id].solved).toBe(true)
    }
  })
  it('verlangt die Begründung und den Gegenbeweis zusätzlich zum richtigen Ort', () => {
    const file = INVESTIGATIONS[0]
    let progress = advanceInvestigation(emptyInvestigationProgress(), {
      type: 'pin',
      caseId: file.id,
      target: file.targets[0].id,
      point: file.targets[0].location,
    })
    progress = submit(progress, 0)
    expect(progress.cases[file.id].feedback?.checks.find((check) => check.id === 'confluence')?.correct).toBe(
      true,
    )
    expect(progress.cases[file.id].solved).toBe(false)
    expect(progress.cleared).toHaveLength(0)
    expect(caseAvailable(progress, INVESTIGATIONS[1].id)).toBe(false)
  })
  it('lässt falsche Schlussfolgerungen beliebig korrigieren, ohne Entwürfe zu verwerfen', () => {
    const file = INVESTIGATIONS[0]
    let progress = prepare(emptyInvestigationProgress(), 0)
    progress = advanceInvestigation(progress, {
      type: 'pin',
      caseId: file.id,
      target: 'confluence',
      point: { lon: 44.9, lat: 41.7 },
    })
    progress = submit(progress, 0)
    const original = progress.cases[file.id]
    expect(original.solved).toBe(false)
    expect(original.proof).toEqual(file.proof)
    expect(submit(progress, 0)).toBe(progress)
    for (let i = 0; i < 5; i++) {
      progress = advanceInvestigation(progress, {
        type: 'pin',
        caseId: file.id,
        target: 'confluence',
        point: { lon: 44.89 - i * 0.01, lat: 41.7 },
      })
      progress = submit(progress, 0)
    }
    expect(progress.cases[file.id].pins).toHaveProperty('confluence')
    progress = advanceInvestigation(progress, {
      type: 'pin',
      caseId: file.id,
      target: 'confluence',
      point: file.targets[0].location,
    })
    progress = submit(progress, 0)
    expect(progress.cases[file.id].solved).toBe(true)
    expect(progress.cases[file.id].submissions).toBe(7)
  })
  it('prüft am See die Wasserfläche statt eines großzügigen Kreises um einen Mittelpunkt', () => {
    const file = INVESTIGATIONS[2],
      run = newInvestigationRun()
    run.proof = file.proof
    run.rejected = file.reject!.id
    run.pins.lake = { lon: 29.5, lat: -6.2 }
    expect(evaluateInvestigation(file, run, mapFor(2)).solved).toBe(true)
    run.pins.lake = { lon: 28, lat: -6.2 }
    expect(evaluateInvestigation(file, run, mapFor(2)).solved).toBe(false)
  })
  it('wertet eine unvollständige Prüfung nicht als Fehlversuch und zählt einen wiederhergestellten Entwurf nicht doppelt', () => {
    let progress = submit(emptyInvestigationProgress(), 0)
    expect(progress.cases.flussprotokoll.submissions).toBe(0)
    progress = prepare(progress, 0)
    progress = advanceInvestigation(progress, {
      type: 'pin',
      caseId: 'flussprotokoll',
      target: 'confluence',
      point: { lon: 44.9, lat: 41.7 },
    })
    progress = submit(progress, 0)
    expect(progress.cases.flussprotokoll.submissions).toBe(1)
    const restored = submit(parseInvestigationProgress(JSON.stringify(progress)), 0)
    expect(restored.cases.flussprotokoll.submissions).toBe(1)
    expect(restored.cases.flussprotokoll.feedback?.solved).toBe(false)
  })
  it('erkennt richtige Orte in falscher Reihenfolge', () => {
    const file = INVESTIGATIONS[1],
      run = newInvestigationRun()
    run.proof = file.proof
    run.rejected = file.reject!.id
    file.targets.forEach((target) => {
      run.pins[target.id] = target.location
    })
    ;[run.pins.start, run.pins.finish] = [run.pins.finish, run.pins.start]
    const verdict = evaluateInvestigation(file, run, mapFor(1))
    expect(verdict.solved).toBe(false)
    expect(verdict.checks.filter((check) => !check.correct).map((check) => check.id)).toEqual([
      'start',
      'finish',
    ])
  })
  it('weist ungültige Koordinaten, fremde Dokumente und gesperrte Aktionen ab', () => {
    const progress = emptyInvestigationProgress()
    expect(advanceInvestigation(progress, { type: 'start', caseId: INVESTIGATIONS[7].id })).toBe(progress)
    expect(
      advanceInvestigation(progress, {
        type: 'pin',
        caseId: INVESTIGATIONS[0].id,
        target: 'confluence',
        point: { lon: Infinity, lat: 0 },
      }),
    ).toBe(progress)
    expect(
      advanceInvestigation(progress, {
        type: 'pin',
        caseId: INVESTIGATIONS[0].id,
        target: 'not-a-target',
        point: INVESTIGATIONS[0].targets[0].location,
      }),
    ).toBe(progress)
    expect(
      advanceInvestigation(progress, { type: 'proof', caseId: INVESTIGATIONS[0].id, evidence: 'foreign' }),
    ).toBe(progress)
  })
  it('speichert Entwürfe, gelesene Unterlagen, Zahlen und gestufte Hilfen', () => {
    let progress = prepare(emptyInvestigationProgress(), 0)
    const id = INVESTIGATIONS[0].id
    progress = advanceInvestigation(progress, { type: 'open', caseId: id, evidence: 'water' })
    for (let i = 0; i < 10; i++) progress = advanceInvestigation(progress, { type: 'hint', caseId: id })
    expect(progress.cases[id].hints).toBe(3)
    const restored = parseInvestigationProgress(JSON.stringify(progress))
    expect(restored.cases[id]).toMatchObject({
      pins: progress.cases[id].pins,
      proof: progress.cases[id].proof,
      opened: ['water'],
      hints: 3,
    })
    expect(caseRating(submit(restored, 0).cases[id])).toBe(1)
  })
  it('bewahrt Freischaltungen und Bestleistung bei einer Wiederholung', () => {
    let progress = submit(prepare(emptyInvestigationProgress(), 0), 0)
    const id = INVESTIGATIONS[0].id
    progress = advanceInvestigation(progress, { type: 'replay', caseId: id })
    expect(progress.cases[id].solved).toBe(false)
    expect(progress.cases[id].pins).toEqual({})
    expect(caseAvailable(progress, INVESTIGATIONS[1].id)).toBe(true)
    progress = advanceInvestigation(progress, { type: 'hint', caseId: id })
    progress = submit(prepare(progress, 0), 0)
    expect(progress.best[id]).toBe(3)
  })
  it('liest nur gültige Speicherdaten und übernimmt keine alten Quiz-Sterne als gelöste Fälle', () => {
    for (const raw of [null, 'bad', '[]', '{"version":2,"levels":{}}', '{"version":1,"cases":null}'])
      expect(parseInvestigationProgress(raw)).toEqual(emptyInvestigationProgress())
    const parsed = parseInvestigationProgress(
      JSON.stringify({
        version: 1,
        cases: {
          flussprotokoll: {
            pins: { confluence: { lon: 999, lat: 42 }, foreign: { lon: 44, lat: 42 } },
            proof: ['water', 'water', 'foreign', 'bearing', 'envelope'],
            hints: 999,
            solved: true,
          },
        },
        cleared: ['letzte-koordinate'],
        best: {},
      }),
    )
    expect(parsed.cleared).toEqual([])
    expect(parsed.cases.flussprotokoll.pins).toEqual({})
    expect(parsed.cases.flussprotokoll.proof).toEqual(['water', 'bearing'])
    expect(parsed.cases.flussprotokoll.solved).toBe(false)
    expect(parsed.cases.flussprotokoll.hints).toBe(3)
  })
  it('unterscheidet Dezimalminuten von Dezimalgraden und rechnet den fiktiven Flug korrekt um', () => {
    const final = INVESTIGATIONS[7].targets[0].location
    expect(final.lat).toBeCloseTo(35 + 53.2 / 60, 4)
    expect(final.lon).toBeCloseTo(14 + 24.2 / 60, 4)
    expect((Date.parse('2026-07-13T01:00:00-11:00') - Date.parse('2026-07-14T00:20:00+13:00')) / 60000).toBe(
      INVESTIGATIONS[3].calculation?.answer,
    )
    expect(numericValue('40,0')).toBe(40)
    expect(numericValue('')).toBeNaN()
    expect(numericValue('40 Minuten')).toBeNaN()
  })
})
