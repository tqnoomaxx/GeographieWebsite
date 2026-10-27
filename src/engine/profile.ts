import type { ProfileField, Question } from './types'
import { matchesExactly } from './normalize'
export const PROFILE_CATEGORIES = [
  { id: 'capital', title: 'Hauptstadt / Regierungssitz' },
  { id: 'continent', title: 'Kontinent (UN-Zuordnung)' },
  { id: 'currency', title: 'Währung' },
  { id: 'language', title: 'Sprache' },
  { id: 'iso2', title: 'ISO-Länderkürzel' },
  { id: 'calling_code', title: 'Telefonvorwahl' },
  { id: 'tld', title: 'Internet-Endung' },
] as const
export const DEFAULT_PROFILE_FIELDS = PROFILE_CATEGORIES.slice(0, 5).map((c) => c.id) as string[]
export function selectedProfileIds(ids?: string[]) {
  const valid = [...new Set(ids)].filter((id) => PROFILE_CATEGORIES.some((c) => c.id === id))
  return valid.length === 5 ? valid : DEFAULT_PROFILE_FIELDS
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
  const hits = fields.filter((f) => !filled[f.id] && profileMatches(input, f))
  return hits.length === 1 ? hits[0] : undefined
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
