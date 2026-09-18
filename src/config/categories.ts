import type { CategoryId } from '@/engine/types'

export interface CategoryDef {
  id: CategoryId
  icon: string
  phase: 'A' | 'B' | 'C' | 'D' | 'E'
  primary: boolean // direkt sichtbar (Progressive Disclosure), sonst unter „Mehr“
  countKey?: string // Schlüssel in data/index.json counts
  generators: string[]
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'flags', icon: '🏳️', phase: 'A', primary: true, countKey: 'flags', generators: ['flag_to_country', 'country_to_flag', 'flag_to_country_input'] },
  { id: 'countries', icon: '🌍', phase: 'A', primary: true, countKey: 'country', generators: ['country_attribute', 'neighbor_of_country', 'country_true_false'] },
  { id: 'capitals', icon: '🏛️', phase: 'A', primary: true, countKey: 'capitals', generators: ['country_to_capital', 'capital_to_country', 'capital_input'] },
  { id: 'maps', icon: '🗺️', phase: 'C', primary: true, generators: ['country_on_map', 'region_on_map'] },
  { id: 'images', icon: '📸', phase: 'D', primary: true, countKey: 'photos', generators: ['image_to_landmark', 'image_to_country', 'image_to_city'] },
  { id: 'regions', icon: '🧭', phase: 'C', primary: false, countKey: 'region', generators: ['region_flag_to_region', 'region_to_country', 'region_capital'] },
  { id: 'cities', icon: '🏙️', phase: 'C', primary: false, countKey: 'city', generators: ['city_to_country', 'city_to_region', 'city_input'] },
  { id: 'landmarks', icon: '🏛️', phase: 'D', primary: false, countKey: 'landmark', generators: ['landmark_to_country', 'landmark_to_city'] },
  { id: 'license_plates', icon: '🚗', phase: 'E', primary: false, countKey: 'license_plate', generators: ['plate_to_city', 'city_to_plate', 'plate_input'] },
  { id: 'mixed', icon: '🎲', phase: 'A', primary: true, generators: [] },
]

export const ROUND_LENGTHS = [10, 20, 50] as const
