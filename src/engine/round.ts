import type { CategoryId } from './types'
import type { Entity } from '@/domain/types'
import { AUTO, ROUND_LENGTHS, quizFor, type Content } from '@/config/quizzes'
import { SCOPES } from './scope'

/**
 * Das Setup einer Runde – die eine Beschreibung dessen, was gespielt wird.
 * Wird identisch in URL, Session und Anzeige verwendet, damit „Noch einmal“, Fortsetzen und Titel immer dasselbe meinen.
 */
export interface RoundConfig {
  category: CategoryId
  /** Fragetyp: 'auto' oder eine Mode-ID aus config/quizzes.ts */
  mode: string
  /** world | <Kontinent> | country:<ISO> */
  scope: string
  length: number | 'all'
  /** Fehler in der Runde wiederholen (R5) */
  repeat: boolean
  /** nur Länder / nur Regionen (Flaggen, Karten) */
  content?: Content[]
  /** nur diese Lernkarten („Fehler wiederholen“) */
  only?: string[]
}

export function defaultRound(category: CategoryId): RoundConfig {
  return { category, mode: AUTO, scope: quizFor(category).defaultScope ?? 'world', length: 10, repeat: true }
}

export function toQuery(c: RoundConfig): string {
  const p = new URLSearchParams()
  p.set('mode', c.mode)
  p.set('scope', c.scope)
  p.set('len', String(c.length))
  if (c.content?.length === 1) p.set('content', c.content[0])
  if (!c.repeat) p.set('repeat', '0')
  if (c.only?.length) p.set('only', c.only.join(','))
  return p.toString()
}

export function fromQuery(category: CategoryId, params: URLSearchParams): RoundConfig {
  const fallback = defaultRound(category)
  const rawLength = params.get('len') ?? '10'
  const numericLength = Number(rawLength)
  const only = params.get('only')?.split(',').filter(Boolean)
  const length = rawLength === 'all' ? 'all' : Number.isInteger(numericLength) && numericLength > 0 && (only?.length || ROUND_LENGTHS.includes(numericLength as (typeof ROUND_LENGTHS)[number])) ? numericLength : fallback.length
  const content = params.get('content')
  const requestedMode = params.get('mode') ?? AUTO
  const mode = requestedMode === AUTO || quizFor(category).modes.some((item) => item.id === requestedMode) ? requestedMode : AUTO
  const requestedScope = params.get('scope') ?? fallback.scope
  const scope = SCOPES.includes(requestedScope as (typeof SCOPES)[number]) || /^country:[A-Z]{2}$/.test(requestedScope) ? requestedScope : fallback.scope
  return {
    category,
    mode,
    scope,
    length,
    repeat: params.get('repeat') !== '0',
    content: content === 'country' || content === 'region' ? [content] : undefined,
    only,
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
