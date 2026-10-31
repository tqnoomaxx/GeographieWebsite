import type { CategoryId } from './types'
import type { Entity } from '@/domain/types'
import { AUTO, ROUND_LENGTHS, modeFor, quizFor, type Content } from '@/config/quizzes'
import { cityMinimum } from '@/domain/cityRecall'
import { SCOPES } from './scope'
import { selectedProfileIds } from './profile'
import { exerciseFor, exerciseScopeAllowed } from '@/config/quizCatalog'

/**
 * Das Setup einer Runde – die eine Beschreibung dessen, was gespielt wird.
 * Wird identisch in URL, Session und Anzeige verwendet, damit „Noch einmal“, Fortsetzen und Titel immer dasselbe meinen.
 */
export interface RoundConfig {
  category: CategoryId
  /** Stable catalog exercise; absent on legacy rounds. */
  exercise?: string
  collection?: string
  fields?: string[]
  minPopulation?: number
  /** Fragetyp: 'auto' oder eine Mode-ID aus config/quizzes.ts */
  mode: string
  /** world | <Kontinent> | country:<ISO> */
  scope: string
  length: number | 'all'
  /** Fehler in der Runde wiederholen (R5) */
  repeat: boolean
  /** nur Länder / nur Regionen (Flaggen, Karten) */
  content?: Content[]
  /** nur diese Lernkarten (Fehlerwiederholung, fällige Inhalte oder gezielte Übung) */
  only?: string[]
  /** verräterische Schrift oder Landesumrisse auf ausgewählten Länderflaggen vor der Antwort verdecken */
  hideFlagHints?: boolean
}

export function defaultRound(category: CategoryId): RoundConfig {
  const quiz = quizFor(category)
  return {
    category,
    mode: quiz.defaultMode ?? AUTO,
    scope: quiz.defaultScope ?? 'world',
    length: 10,
    repeat: true,
  }
}

export function toQuery(c: RoundConfig): string {
  const p = new URLSearchParams()
  if (c.exercise) p.set('quiz', c.exercise)
  if (c.collection) p.set('collection', c.collection)
  if (c.minPopulation !== undefined) p.set('population', String(c.minPopulation))
  if (c.fields?.length) p.set('fields', c.fields.join(','))
  p.set('mode', c.mode)
  p.set('scope', c.scope)
  p.set('len', String(c.length))
  if (c.content?.length === 1) p.set('content', c.content[0])
  if (c.exercise === 'country-profile') p.set('repeat', c.repeat ? '1' : '0')
  else if (!c.repeat) p.set('repeat', '0')
  if (c.hideFlagHints) p.set('hide_hints', '1')
  if (c.only?.length) p.set('only', c.only.join(','))
  return p.toString()
}

export function fromQuery(category: CategoryId, params: URLSearchParams): RoundConfig {
  const fallback = defaultRound(category)
  const rawLength = params.get('len') ?? '10'
  const numericLength = Number(rawLength)
  const only = params.get('only')?.split(',').filter(Boolean)
  const length =
    rawLength === 'all'
      ? 'all'
      : Number.isInteger(numericLength) &&
          numericLength > 0 &&
          (only?.length || ROUND_LENGTHS.includes(numericLength as (typeof ROUND_LENGTHS)[number]))
        ? numericLength
        : fallback.length
  const content = params.get('content')
  const requestedScope = params.get('scope') ?? fallback.scope
  const scope =
    SCOPES.includes(requestedScope as (typeof SCOPES)[number]) || /^country:[A-Z]{2}$/.test(requestedScope)
      ? requestedScope
      : fallback.scope
  const exercise = exerciseFor(params.get('quiz') ?? undefined)
  const selected = exercise?.topic === category ? exercise : undefined
  const requestedMode = params.get('mode') ?? AUTO
  const requestedModeDef = modeFor(category, requestedMode)
  const modeAllowedInScope =
    requestedModeDef &&
    (!scope.startsWith('country:') || requestedModeDef.allowCountryScope !== false) &&
    (!requestedModeDef.scopes || requestedModeDef.scopes.includes(scope))
  const mode = requestedMode === AUTO || modeAllowedInScope ? requestedMode : AUTO
  const selectedMode = selected
    ? selected.variants[requestedMode as 'choice' | 'input' | 'map'] &&
      exerciseScopeAllowed(selected, scope, requestedMode)
      ? requestedMode
      : (Object.keys(selected.variants).find((form) => exerciseScopeAllowed(selected, scope, form)) ??
        Object.keys(selected.variants)[0])
    : mode
  return {
    category,
    exercise: selected?.id,
    collection:
      selected?.kind === 'language-course'
        ? params.get('collection') === 'words'
          ? 'words'
          : 'alphabet'
        : selected?.collections
          ? (selected.collections.find((c) => c.id === params.get('collection')) ?? selected.collections[0])
              .id
          : undefined,
    minPopulation:
      selected?.kind === 'city-recall'
        ? cityMinimum(params.has('population') ? Number(params.get('population')) : undefined)
        : undefined,
    fields: selected?.kind === 'profile' ? selectedProfileIds(params.get('fields')?.split(',')) : undefined,
    mode: selectedMode,
    scope:
      selected && !exerciseScopeAllowed(selected, scope, selectedMode)
        ? (selected.defaultScope ?? 'world')
        : scope,
    length: selected?.kind === 'city-recall' ? 'all' : length,
    repeat:
      selected?.kind === 'city-recall'
        ? false
        : selected?.kind === 'profile'
          ? params.get('repeat') === '1'
          : params.get('repeat') !== '0',
    content: content === 'country' || content === 'region' ? [content] : undefined,
    only,
    hideFlagHints: params.get('hide_hints') === '1',
  }
}

export const roundPath = (c: RoundConfig) => `/play/${c.category}/round?${toQuery(c)}`

export const isCountryScope = (scope: string) => scope.startsWith('country:')

/** Filter auf Länder / Regionen; undefined = alles. */
export function contentFilter(content?: Content[]): ((e: Entity) => boolean) | undefined {
  if (!content || content.length !== 1) return undefined
  const [kind] = content
  return (e) => e.type === kind
}
