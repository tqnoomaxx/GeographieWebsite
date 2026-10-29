import { geoContains, geoDistance } from 'd3-geo'
import { INVESTIGATIONS, type Coordinates, type Investigation } from './investigations'

export type MapData = GeoJSON.FeatureCollection<GeoJSON.Geometry, { kind: string; name: string; id?: string }>
export type Check = { id: string; correct: boolean; message: string }
export type CaseVerdict = { solved: boolean; checks: Check[]; signature: string }
export type InvestigationRun = {
  pins: Record<string, Coordinates>
  proof: string[]
  rejected: string
  calculation: string
  opened: string[]
  hints: number
  submissions: number
  solved: boolean
  lastSubmission?: string
  feedback?: CaseVerdict
}
export type InvestigationProgress = {
  version: 1
  cases: Record<string, InvestigationRun>
  cleared: string[]
  best: Record<string, number>
}
export type InvestigationAction =
  | { type: 'start' | 'replay' | 'hint'; caseId: string }
  | { type: 'pin'; caseId: string; target: string; point: Coordinates }
  | { type: 'remove-pin'; caseId: string; target: string }
  | { type: 'open' | 'proof' | 'reject'; caseId: string; evidence: string }
  | { type: 'calculation'; caseId: string; value: string }
  | { type: 'submit'; caseId: string; map: MapData }

export const emptyInvestigationProgress = (): InvestigationProgress => ({
  version: 1,
  cases: {},
  cleared: [],
  best: {},
})
export const newInvestigationRun = (): InvestigationRun => ({
  pins: {},
  proof: [],
  rejected: '',
  calculation: '',
  opened: [],
  hints: 0,
  submissions: 0,
  solved: false,
})
export const nextInvestigation = (progress: InvestigationProgress) =>
  Math.min(progress.cleared.length, INVESTIGATIONS.length - 1)
export const caseAvailable = (progress: InvestigationProgress, id: string) => {
  const index = INVESTIGATIONS.findIndex((item) => item.id === id)
  return index >= 0 && index <= progress.cleared.length
}
export const pointDistance = (a: Coordinates, b: Coordinates) =>
  geoDistance([a.lon, a.lat], [b.lon, b.lat]) * 6371
export const numericValue = (value: string) => (value.trim() ? Number(value.trim().replace(',', '.')) : NaN)
export const pointInBounds = (point: Coordinates, bounds: Investigation['bounds']) =>
  Number.isFinite(point.lon) &&
  Number.isFinite(point.lat) &&
  point.lon >= bounds[0] &&
  point.lon <= bounds[2] &&
  point.lat >= bounds[1] &&
  point.lat <= bounds[3]
export const caseRating = (run: InvestigationRun) =>
  run.hints === 0 && run.submissions <= 1 ? 3 : run.hints <= 1 && run.submissions <= 3 ? 2 : 1
export const ratingLabel = (rating: number) =>
  rating === 3
    ? 'Eigenständig ermittelt'
    : rating === 2
      ? 'Mit Denkanstoß ermittelt'
      : 'Mit Unterstützung ermittelt'

function signature(run: InvestigationRun) {
  return JSON.stringify([
    Object.entries(run.pins)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, p]) => [id, +p.lon.toFixed(5), +p.lat.toFixed(5)]),
    [...run.proof].sort(),
    run.rejected,
    numericValue(run.calculation),
  ])
}
export function evaluateInvestigation(file: Investigation, run: InvestigationRun, map: MapData): CaseVerdict {
  const checks: Check[] = file.targets.map((target) => {
    const pin = run.pins[target.id]
    const feature = target.feature
      ? map.features.find((item) => item.properties.id === target.feature)
      : undefined
    const correct =
      !!pin &&
      (target.feature
        ? !!feature && geoContains(feature, [pin.lon, pin.lat])
        : pointDistance(pin, target.location) <= target.radiusKm)
    return {
      id: target.id,
      correct,
      message: correct
        ? `${target.label}: Die Position passt zu den Unterlagen.`
        : !pin
          ? `${target.label}: Setze zuerst eine Markierung.`
          : file.targets.length > 1
            ? `${target.label}: Prüfe Ort und Reihenfolge anhand der Unterlagen.`
            : target.feature
              ? 'Die Markierung liegt nicht auf der gesuchten Wasserfläche. Prüfe Uferstaaten und Abfluss.'
              : 'Die Position passt noch nicht zu allen Ortsangaben. Prüfe Richtung, Lage und Entfernung.',
    }
  })
  const proofCorrect =
    run.proof.length === file.proof.length && file.proof.every((id) => run.proof.includes(id))
  checks.push({
    id: 'proof',
    correct: proofCorrect,
    message: proofCorrect
      ? 'Begründung: Die beiden Belege stützen deine Schlussfolgerung.'
      : 'Begründung: Wähle zwei Unterlagen, die den Ort oder die Route gemeinsam belegen. Ein widersprüchlicher Bericht ist kein Beleg.',
  })
  if (file.reject) {
    const correct = run.rejected === file.reject.id
    checks.push({
      id: 'reject',
      correct,
      message: correct
        ? 'Gegenprüfung: Der unzuverlässige Bericht ist erkannt.'
        : 'Gegenprüfung: Welche Unterlage enthält eine geografisch falsche Schlussfolgerung?',
    })
  }
  if (file.calculation) {
    const correct = numericValue(run.calculation) === file.calculation.answer
    checks.push({
      id: 'calculation',
      correct,
      message: correct ? `${file.calculation.label}: Die Rechnung stimmt.` : file.calculation.feedback,
    })
  }
  return { solved: checks.every((check) => check.correct), checks, signature: signature(run) }
}

export function advanceInvestigation(
  progress: InvestigationProgress,
  action: InvestigationAction,
): InvestigationProgress {
  const file = INVESTIGATIONS.find((item) => item.id === action.caseId)
  if (!file || !caseAvailable(progress, file.id)) return progress
  const previous = progress.cases[file.id]
  if (action.type === 'start' && previous) return progress
  if (action.type === 'replay' && !progress.cleared.includes(file.id)) return progress
  let run = previous ?? newInvestigationRun()
  let cleared = progress.cleared
  let best = progress.best
  if (action.type === 'start' || action.type === 'replay') run = newInvestigationRun()
  else {
    if (run.solved) return progress
    if (action.type === 'pin') {
      if (
        !file.targets.some((target) => target.id === action.target) ||
        !pointInBounds(action.point, file.bounds)
      )
        return progress
      run = {
        ...run,
        pins: { ...run.pins, [action.target]: { lon: action.point.lon, lat: action.point.lat } },
        feedback: undefined,
      }
    }
    if (action.type === 'remove-pin') {
      const pins = { ...run.pins }
      delete pins[action.target]
      run = { ...run, pins, feedback: undefined }
    }
    if (action.type === 'open' || action.type === 'proof' || action.type === 'reject') {
      if (!file.evidence.some((item) => item.id === action.evidence)) return progress
      if (action.type === 'open') {
        if (run.opened.includes(action.evidence)) return progress
        run = { ...run, opened: [...run.opened, action.evidence] }
      }
      if (action.type === 'proof') {
        if (!run.proof.includes(action.evidence) && run.proof.length >= file.proof.length) return progress
        run = {
          ...run,
          proof: run.proof.includes(action.evidence)
            ? run.proof.filter((id) => id !== action.evidence)
            : [...run.proof, action.evidence],
          feedback: undefined,
        }
      }
      if (action.type === 'reject') run = { ...run, rejected: action.evidence, feedback: undefined }
    }
    if (action.type === 'calculation')
      run = { ...run, calculation: action.value.slice(0, 32), feedback: undefined }
    if (action.type === 'hint') {
      if (run.hints >= file.hints.length) return progress
      run = { ...run, hints: run.hints + 1 }
    }
    if (action.type === 'submit') {
      const verdict = evaluateInvestigation(file, run, action.map)
      // Repeatedly checking an unchanged conclusion never adds attempts.
      if (previous?.feedback?.signature === verdict.signature) return progress
      const complete =
        file.targets.every((target) => !!run.pins[target.id]) &&
        run.proof.length === file.proof.length &&
        (!file.reject || !!run.rejected) &&
        (!file.calculation || Number.isFinite(numericValue(run.calculation)))
      run = {
        ...run,
        submissions: run.submissions + (complete && run.lastSubmission !== verdict.signature ? 1 : 0),
        solved: verdict.solved,
        feedback: verdict,
        lastSubmission: complete ? verdict.signature : run.lastSubmission,
      }
      if (verdict.solved) {
        if (!cleared.includes(file.id)) cleared = [...cleared, file.id]
        best = { ...best, [file.id]: Math.max(best[file.id] ?? 0, caseRating(run)) }
      }
    }
  }
  return { ...progress, cases: { ...progress.cases, [file.id]: run }, cleared, best }
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const count = (value: unknown, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0
export function parseInvestigationProgress(raw: string | null): InvestigationProgress {
  const clean = emptyInvestigationProgress()
  if (!raw || raw.length > 100_000) return clean
  try {
    const source: unknown = JSON.parse(raw)
    if (!record(source) || source.version !== 1 || !record(source.cases)) return clean
    for (const file of INVESTIGATIONS) {
      if (!Array.isArray(source.cleared) || !source.cleared.includes(file.id)) break
      clean.cleared.push(file.id)
    }
    for (const file of INVESTIGATIONS) {
      if (!caseAvailable(clean, file.id)) continue
      const value = source.cases[file.id]
      if (!record(value)) continue
      const run = newInvestigationRun()
      if (record(value.pins))
        for (const target of file.targets) {
          const pin = value.pins[target.id]
          if (
            record(pin) &&
            typeof pin.lon === 'number' &&
            typeof pin.lat === 'number' &&
            pointInBounds({ lon: pin.lon, lat: pin.lat }, file.bounds)
          )
            run.pins[target.id] = { lon: pin.lon, lat: pin.lat }
        }
      const ids = new Set(file.evidence.map((item) => item.id))
      for (const field of ['proof', 'opened'] as const) {
        const items = value[field]
        if (Array.isArray(items))
          run[field] = [
            ...new Set(items.filter((id): id is string => typeof id === 'string' && ids.has(id))),
          ].slice(0, field === 'proof' ? file.proof.length : ids.size)
      }
      run.rejected = typeof value.rejected === 'string' && ids.has(value.rejected) ? value.rejected : ''
      run.calculation = typeof value.calculation === 'string' ? value.calculation.slice(0, 32) : ''
      run.hints = count(value.hints, file.hints.length)
      run.submissions = count(value.submissions, 10000)
      if (typeof value.lastSubmission === 'string' && value.lastSubmission === signature(run))
        run.lastSubmission = value.lastSubmission
      run.solved = value.solved === true && clean.cleared.includes(file.id)
      clean.cases[file.id] = run
      if (clean.cleared.includes(file.id))
        clean.best[file.id] = record(source.best) ? Math.max(1, count(source.best[file.id], 3)) : 1
    }
  } catch {
    /* A damaged or older save must never break the story. */
  }
  return clean
}
