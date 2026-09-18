import type { Entity } from '@/domain/types'

/** Bereich: world | <continent> | country:<ISO> */
export function inScope(e: Entity, scope: string, byId: Map<string, Entity>): boolean {
  if (scope === 'world') return true
  const countries = (e.attributes.countries as string[] | undefined) ?? (e.attributes.country ? [e.attributes.country] : [])
  if (scope.startsWith('country:')) {
    if (e.id === scope) return true
    return countries.includes(scope)
  }
  if (countries.length > 1) return countries.some((c) => byId.get(c)?.attributes.continent === scope)
  const continent = e.attributes.continent ?? (e.attributes.country ? byId.get(e.attributes.country)?.attributes.continent : undefined)
  return continent === scope
}

export const SCOPES = ['world', 'europe', 'asia', 'africa', 'north-america', 'south-america', 'oceania'] as const
