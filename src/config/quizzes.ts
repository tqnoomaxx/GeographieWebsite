import type { CategoryId } from '@/engine/types'

/**
 * Zentrale Quiz-Konfiguration. Hier – und nur hier – wird eingestellt, was spielbar ist.
 *
 * Ein Quiz ist immer:  Kategorie · Fragetyp · Bereich · Rundenlänge.
 *
 *  - Kategorie  = ein Eintrag in QUIZZES (Flaggen, Hauptstädte, …)
 *  - Fragetyp   = ein `modes`-Eintrag oder „Automatisch“ (mischt alle Fragetypen mit form 'choice', R10)
 *  - Bereich    = world | <Kontinent> | country:<ISO> (einzelnes Land nur mit `perCountry`)
 *  - Länge      = 10 / 20 / 50 / Alle (ROUND_LENGTHS), ein Fragetyp kann „Alle“ erzwingen
 *
 * Labels stehen in locales unter category.<id>, modes.<id> und modes_desc.<id>.
 * Neue Fragetypen: Generator in src/engine/generators anlegen, in registry.ts eintragen, hier einem Fragetyp zuordnen.
 */

export type Content = 'country' | 'region'

/** choice = Multiple Choice (Teil von „Automatisch“) · input = Eintippen · map = Karte antippen (beide nur ausdrücklich, R10) */
export type ModeForm = 'choice' | 'input' | 'map'

export interface QuizMode {
  id: string
  form: ModeForm
  generators: string[]
  /** erzwungene Rundenlänge, z. B. Europa-Karte immer „Alle“ */
  length?: 'all'
  /** erzwungener Inhalt (Länder / Regionen) */
  content?: Content[]
  /** nur in diesen Bereichen anbieten */
  scopes?: string[]
}

export interface QuizDef {
  id: CategoryId
  icon: string
  /** direkt auf der Startseite sichtbar, sonst unter „Mehr“ */
  primary: boolean
  /** Schlüssel in data/index.json counts (Anzeige der Kartenzahl) */
  countKey?: string
  /** nachzuladende Daten */
  needs?: Array<'regions' | 'plates'>
  /** ein einzelnes Land ist als Bereich wählbar (Bundesländer, Kennzeichen, Städte eines Landes …) */
  perCountry?: boolean
  /** Inhaltsfilter Länder / Regionen / Alles anbieten */
  content?: boolean
  /** Startbereich, wenn noch nichts gespeichert ist */
  defaultScope?: string
  modes: QuizMode[]
}

export const AUTO = 'auto'
export const ROUND_LENGTHS = [10, 20, 50] as const
/** Weniger Lernkarten ergeben keine sinnvolle Runde (vier Antwortoptionen). */
export const MIN_POOL = 4

export const QUIZZES: QuizDef[] = [
  {
    id: 'flags', icon: '🏳️', primary: true, countKey: 'flags', needs: ['regions'], perCountry: true, content: true,
    modes: [
      { id: 'flag_to_name', form: 'choice', generators: ['flag_to_country', 'flag_to_region'] },
      { id: 'name_to_flag', form: 'choice', generators: ['country_to_flag', 'region_to_flag'] },
      { id: 'region_flag_to_country', form: 'choice', generators: ['region_flag_to_country'], content: ['region'] },
      { id: 'flag_input', form: 'input', generators: ['flag_to_country_input'] },
      { id: 'flag_to_map', form: 'map', generators: ['flag_to_country_map', 'flag_to_region_map'] },
      { id: 'europe_map', form: 'map', generators: ['flag_to_europe_map'], length: 'all', scopes: ['world', 'europe'], content: ['region'] },
    ],
  },
  {
    id: 'countries', icon: '🌍', primary: true, countKey: 'country',
    modes: [
      { id: 'attributes', form: 'choice', generators: ['country_attribute'] },
      { id: 'neighbors', form: 'choice', generators: ['neighbor_of_country'] },
      { id: 'true_false', form: 'choice', generators: ['country_true_false'] },
    ],
  },
  {
    id: 'capitals', icon: '🏛️', primary: true, countKey: 'capitals',
    modes: [
      { id: 'country_to_capital', form: 'choice', generators: ['country_to_capital'] },
      { id: 'capital_to_country', form: 'choice', generators: ['capital_to_country'] },
      { id: 'capital_input', form: 'input', generators: ['capital_input'] },
    ],
  },
  {
    id: 'maps', icon: '🗺️', primary: true, needs: ['regions'], perCountry: true, content: true,
    modes: [
      { id: 'countries_on_map', form: 'map', generators: ['country_on_map'] },
      { id: 'regions_on_map', form: 'map', generators: ['region_on_map'] },
    ],
  },
  {
    id: 'images', icon: '📸', primary: true, countKey: 'photos', perCountry: true,
    modes: [
      { id: 'image_to_landmark', form: 'choice', generators: ['image_to_landmark'] },
      { id: 'image_to_city', form: 'choice', generators: ['image_to_city'] },
      { id: 'image_to_country', form: 'choice', generators: ['image_to_country'] },
    ],
  },
  {
    id: 'regions', icon: '🧭', primary: false, countKey: 'region', needs: ['regions'], perCountry: true, defaultScope: 'country:DE',
    modes: [
      { id: 'flag_to_name', form: 'choice', generators: ['region_flag_to_region'] },
      { id: 'region_to_country', form: 'choice', generators: ['region_to_country'] },
      { id: 'region_capital', form: 'choice', generators: ['region_capital'] },
    ],
  },
  {
    id: 'cities', icon: '🏙️', primary: false, countKey: 'city', needs: ['regions'], perCountry: true,
    modes: [
      { id: 'city_to_country', form: 'choice', generators: ['city_to_country'] },
      { id: 'city_to_region', form: 'choice', generators: ['city_to_region'] },
      { id: 'capital_input', form: 'input', generators: ['city_input'] },
    ],
  },
  {
    id: 'landmarks', icon: '🏛️', primary: false, countKey: 'landmark', perCountry: true,
    modes: [
      { id: 'landmark_to_country', form: 'choice', generators: ['landmark_to_country'] },
      { id: 'landmark_to_city', form: 'choice', generators: ['landmark_to_city'] },
    ],
  },
  {
    id: 'water', icon: '🌊', primary: false, countKey: 'water', perCountry: true,
    modes: [
      { id: 'to_country', form: 'choice', generators: ['river_to_country', 'lake_to_country'] },
      { id: 'compare', form: 'choice', generators: ['river_longer', 'lake_larger'] },
      { id: 'on_map', form: 'map', generators: ['water_on_map'] },
    ],
  },
  {
    id: 'nature', icon: '🏔️', primary: false, countKey: 'mountain', perCountry: true,
    modes: [
      { id: 'to_country', form: 'choice', generators: ['mountain_to_country'] },
      { id: 'compare', form: 'choice', generators: ['mountain_higher'] },
      { id: 'on_map', form: 'map', generators: ['mountain_on_map'] },
    ],
  },
  {
    id: 'license_plates', icon: '🚗', primary: false, countKey: 'license_plate', needs: ['plates'], perCountry: true, defaultScope: 'country:DE',
    modes: [
      { id: 'plate_to_city', form: 'choice', generators: ['plate_to_city'] },
      { id: 'city_to_plate', form: 'choice', generators: ['city_to_plate'] },
      { id: 'plate_input', form: 'input', generators: ['plate_input'] },
    ],
  },
  /** Gemischt: alle Multiple-Choice-Fragetypen der anderen Kategorien, kein eigener Fragetyp wählbar. */
  { id: 'mixed', icon: '🎲', primary: true, needs: ['regions', 'plates'], perCountry: true, modes: [] },
]

/** Generatoren, die im gemischten Modus ohne Kategorie-Kontext verwirren (z. B. Regionsname → Flagge). */
export const MIXED_EXCLUDE = new Set(['region_to_flag'])

export function isCategory(id: string | undefined): id is CategoryId {
  return QUIZZES.some((q) => q.id === id)
}

export function quizFor(id: CategoryId): QuizDef {
  const q = QUIZZES.find((x) => x.id === id)
  if (!q) throw new Error(`Unbekannte Kategorie: ${id}`)
  return q
}

export function modeFor(category: CategoryId, mode: string): QuizMode | undefined {
  return quizFor(category).modes.find((m) => m.id === mode)
}

/** Fragetypen, die „Automatisch“ mischt: Multiple Choice; hat eine Kategorie keine, alle (z. B. Karten). */
export function autoModes(quiz: QuizDef): QuizMode[] {
  const choice = quiz.modes.filter((m) => m.form === 'choice')
  return choice.length ? choice : quiz.modes
}
