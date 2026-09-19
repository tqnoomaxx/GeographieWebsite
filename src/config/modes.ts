import type { CategoryId } from '@/engine/types'

/**
 * Wählbare Fragetypen pro Kategorie. „Automatisch“ (kein Eintrag) mischt die Multiple-Choice-Varianten (R10).
 * Labels in locales unter modes.<id> und modes_desc.<id>.
 */
export interface ModeDef {
  id: string
  generators: string[]
  /** erzwungene Rundenlänge, z. B. Europa-Karte immer „Alle“ */
  length?: 'all'
  /** nur in diesen Bereichen anbieten */
  scopes?: string[]
  /** erzwungener Inhalt (Länder/Regionen) */
  kinds?: Array<'country' | 'region'>
}

export const MODES: Partial<Record<CategoryId, ModeDef[]>> = {
  flags: [
    { id: 'flag_to_name', generators: ['flag_to_country', 'flag_to_region'] },
    { id: 'name_to_flag', generators: ['country_to_flag', 'region_to_flag'] },
    { id: 'flag_to_map', generators: ['flag_to_country_map', 'flag_to_region_map'] },
    { id: 'flag_input', generators: ['flag_to_country_input'] },
    { id: 'europe_map', generators: ['flag_to_europe_map'], length: 'all', scopes: ['world', 'europe'], kinds: ['region'] },
  ],
  countries: [
    { id: 'attributes', generators: ['country_attribute'] },
    { id: 'neighbors', generators: ['neighbor_of_country'] },
    { id: 'true_false', generators: ['country_true_false'] },
  ],
  capitals: [
    { id: 'country_to_capital', generators: ['country_to_capital'] },
    { id: 'capital_to_country', generators: ['capital_to_country'] },
    { id: 'capital_input', generators: ['capital_input'] },
  ],
  regions: [
    { id: 'flag_to_name', generators: ['region_flag_to_region'] },
    { id: 'region_to_country', generators: ['region_to_country'] },
    { id: 'region_capital', generators: ['region_capital'] },
  ],
  cities: [
    { id: 'city_to_country', generators: ['city_to_country'] },
    { id: 'city_to_region', generators: ['city_to_region'] },
    { id: 'capital_input', generators: ['city_input'] },
  ],
  maps: [
    { id: 'countries_on_map', generators: ['country_on_map'] },
    { id: 'regions_on_map', generators: ['region_on_map'] },
  ],
  images: [
    { id: 'image_to_landmark', generators: ['image_to_landmark'] },
    { id: 'image_to_city', generators: ['image_to_city'] },
    { id: 'image_to_country', generators: ['image_to_country'] },
  ],
  landmarks: [
    { id: 'landmark_to_country', generators: ['landmark_to_country'] },
    { id: 'landmark_to_city', generators: ['landmark_to_city'] },
  ],
  water: [
    { id: 'to_country', generators: ['river_to_country', 'lake_to_country'] },
    { id: 'compare', generators: ['river_longer', 'lake_larger'] },
    { id: 'on_map', generators: ['water_on_map'] },
  ],
  nature: [
    { id: 'to_country', generators: ['mountain_to_country'] },
    { id: 'compare', generators: ['mountain_higher'] },
    { id: 'on_map', generators: ['mountain_on_map'] },
  ],
  license_plates: [
    { id: 'plate_to_city', generators: ['plate_to_city'] },
    { id: 'city_to_plate', generators: ['city_to_plate'] },
    { id: 'plate_input', generators: ['plate_input'] },
  ],
}
