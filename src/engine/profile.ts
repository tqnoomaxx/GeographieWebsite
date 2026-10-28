import type { ProfileField, Question } from './types'
import { matchesExactly, normalizeAnswer } from './normalize'
export const PROFILE_CATEGORIES = [
  { id: 'capital', title: 'Hauptstadt / Regierungssitz' },
  { id: 'continent', title: 'Kontinent (UN-Zuordnung)' },
  { id: 'currency', title: 'Währung' },
  { id: 'language', title: 'Sprache' },
  { id: 'iso2', title: 'ISO-Länderkürzel' },
  { id: 'calling_code', title: 'Telefonvorwahl' },
  { id: 'tld', title: 'Internet-Endung' },
  { id: 'highest_point', title: 'Höchste Erhebung' },
  { id: 'neighbors', title: 'Nachbarländer' },
  { id: 'iso3', title: 'ISO-Länderkürzel (3 Buchstaben)' },
  { id: 'subregion', title: 'Weltregion' },
  { id: 'national_animal', title: 'Nationaltier / Wappentier' },
  { id: 'national_bird', title: 'Nationalvogel' },
  { id: 'national_flower', title: 'Nationalblume' },
  { id: 'national_tree', title: 'Nationalbaum' },
] as const
export const DEFAULT_PROFILE_FIELDS = PROFILE_CATEGORIES.slice(0, 5).map((c) => c.id) as string[]
export function selectedProfileIds(ids?: string[]) {
  const valid = [...new Set(ids)].filter((id) => PROFILE_CATEGORIES.some((c) => c.id === id))
  return valid.length ? valid : DEFAULT_PROFILE_FIELDS
}
export function selectProfileFields(fields: ProfileField[], ids?: string[]) {
  const selected = selectedProfileIds(ids)
  return selected.map((id) => fields.find((f) => f.id === id)).filter((f): f is ProfileField => !!f)
}
export function profileMatches(value: string, field: ProfileField) {
  if (field.normalization === 'domain')
    return field.answers.some((a) => a.toLowerCase() === value.trim().toLowerCase())
  if (field.normalization === 'code') {
    const alphabetic = field.answers.every((answer) => /^[a-z]+$/i.test(answer))
    const norm = (s: string) =>
      alphabetic
        ? s.trim().toLowerCase()
        : s
            .trim()
            .toLowerCase()
            .replace(/[ +()-]/g, '')
    return !!norm(value) && field.answers.some((a) => norm(a) === norm(value))
  }
  return matchesExactly(value, field.answers)
}
export function profileHit(fields: ProfileField[], filled: Record<string, string>, input: string) {
  const hits = profileHits(fields, filled, input)
  return hits.length === 1 ? hits[0] : undefined
}
export function profileHits(fields: ProfileField[], filled: Record<string, string>, input: string) {
  return fields.filter((f) => !filled[f.id] && profileMatches(input, f))
}
/** A short valid code must not cut off a word still being typed, e.g. DE → Deutsch. */
export function profileHasLongerMatch(fields: ProfileField[], filled: Record<string, string>, input: string) {
  const normalized = normalizeAnswer(input)
  return (
    !!normalized &&
    fields.some(
      (f) =>
        !filled[f.id] &&
        f.answers.some((answer) => {
          const candidate = normalizeAnswer(answer)
          return candidate.length > normalized.length && candidate.startsWith(normalized)
        }),
    )
  )
}
export function validProfileAnswer(q: Question, given: string) {
  try {
    const values = JSON.parse(given) as Record<string, string>
    return (
      !!q.profileFields?.length &&
      q.profileFields.every((f) => typeof values[f.id] === 'string' && profileMatches(values[f.id], f))
    )
  } catch {
    return false
  }
}
