export type EntityType = 'country' | 'region' | 'city' | 'river' | 'lake' | 'mountain' | 'landmark' | 'license_plate'
export type RelationshipType =
  | 'capital_of'
  | 'located_in'
  | 'neighbor_of'
  | 'flows_through'
  | 'part_of'
  | 'plate_code_of'
  | 'similar_to'

export type ContinentId = 'europe' | 'asia' | 'africa' | 'north-america' | 'south-america' | 'oceania' | 'antarctica'

export interface Provenance {
  source: string
  source_id?: string
  source_url?: string
  license?: string
  last_updated?: string
  imported_at: string
  fields?: Record<string, { source: string; source_id?: string; imported_at: string }>
  conflicts?: Array<{ field: string; values: Array<{ source: string; value: unknown }> }>
}

export interface Media {
  id: string
  kind: 'flag' | 'photo' | 'coat_of_arms' | 'map' | 'icon'
  url: string
  source: string
  source_url?: string
  author?: string
  license: string
  license_url?: string
  attribution: string
  caption?: string
}

export interface Entity {
  id: string
  type: EntityType
  names: { de: string; en?: string; [lang: string]: string | undefined }
  aliases?: string[]
  location?: { lat: number; lon: number }
  geometry?: string
  media?: Media[]
  attributes: Record<string, unknown> & {
    continent?: ContinentId
    country?: string
    region?: string
    population?: number
  }
  provenance: Provenance
}

export interface CountryAttributes {
  iso2: string
  iso3?: string
  continent?: ContinentId
  subregion?: string
  capital?: string
  capital_names?: string[]
  population?: number
  area_km2?: number
  currencies?: Array<{ code: string; name: string; symbol?: string }>
  languages?: string[]
  tld?: string[]
  calling_code?: string
  independent?: boolean
  un_member?: boolean
  landlocked?: boolean
  borders?: string[]
  emoji?: string
  wikidata?: string
  highest_point?: { name: string; elevation_m?: number; wikidata?: string }
}

export interface Country extends Entity {
  type: 'country'
  attributes: Entity['attributes'] & CountryAttributes
}

export interface Relationship {
  from: string
  to: string
  type: RelationshipType
}

export interface DataIndex {
  files: Record<string, string>
  regions: Record<string, { file: string; count: number }>
  plates?: Record<string, { file: string; count: number }>
  region_maps?: Record<string, string>
  counts: Record<string, number>
  continents: Record<string, number>
}

export type Scope = 'world' | ContinentId | `country:${string}`
