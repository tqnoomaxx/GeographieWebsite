import type { CategoryId } from '@/engine/types'
import type { CollectionDef } from '@/config/collections'
import type { Entity } from '@/domain/types'

/** Query-Parameter einer Runde: eindeutig, damit „Noch einmal“ und Fortsetzen identisch konfiguriert werden. */
export interface RoundConfig {
  category: CategoryId
  scope: string
  length: number | 'all'
  gens?: string[]
  collection?: string
  kinds?: Array<'country' | 'region'>
  repeat: boolean
  only?: string[]
}

export function toQuery(c: RoundConfig): string {
  const p = new URLSearchParams()
  p.set('scope', c.scope)
  p.set('len', String(c.length))
  if (c.gens?.length) p.set('gens', c.gens.join(','))
  if (c.collection) p.set('collection', c.collection)
  if (c.kinds?.length && c.kinds.length < 2) p.set('kinds', c.kinds.join(','))
  if (!c.repeat) p.set('repeat', '0')
  if (c.only?.length) p.set('only', c.only.join(','))
  return p.toString()
}

export function fromQuery(category: CategoryId, params: URLSearchParams): RoundConfig {
  const len = params.get('len') ?? '10'
  return {
    category,
    scope: params.get('scope') ?? 'world',
    length: len === 'all' ? 'all' : Number(len),
    gens: params.get('gens')?.split(',').filter(Boolean),
    collection: params.get('collection') ?? undefined,
    kinds: (params.get('kinds')?.split(',').filter(Boolean) as Array<'country' | 'region'> | undefined),
    repeat: params.get('repeat') !== '0',
    only: params.get('only')?.split(',').filter(Boolean),
  }
}

export function entityFilterFor(kinds?: Array<'country' | 'region'>): ((e: Entity) => boolean) | undefined {
  if (!kinds || kinds.length === 2) return undefined
  return (e) => kinds.includes(e.type as 'country' | 'region')
}

export function collectionConfig(col: CollectionDef): Pick<RoundConfig, 'scope' | 'kinds' | 'collection'> {
  return { scope: col.scope, kinds: col.kinds, collection: col.id }
}
