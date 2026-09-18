import type { Entity } from '@/domain/types'

/** Bereich: world | <continent> | country:<ISO> */
export function inScope(e: Entity, scope: string, byId: Map<string, Entity>): boolean {
  if (scope === 'world') return true
  if (scope.startsWith('country:')) {
    if (e.id === scope) return true
    return e.attributes.country === scope
  }
  const continent = e.attributes.continent ?? (e.attributes.country ? byId.get(e.attributes.country)?.attributes.continent : undefined)
  return continent === scope
}

export const SCOPES = ['world', 'europe', 'asia', 'africa', 'north-america', 'south-america', 'oceania'] as const
