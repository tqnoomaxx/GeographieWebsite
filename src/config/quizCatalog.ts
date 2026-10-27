import type { CategoryId } from '@/engine/types'
import type { Entity } from '@/domain/types'
import type { DataResource } from '@/app/DataProvider'
import type { Content, ModeForm } from './quizzes'

/** Add an exercise here; menu, options, resources and round generation share this catalog. */
export interface QuizTopic {
  id: CategoryId
  title: string
  description: string
  icon: string
  featured: boolean
}
export interface Exercise {
  id: string
  topic: CategoryId
  title: string
  description: string
  variants: Partial<Record<ModeForm, string[]>>
  scope: 'none' | 'world' | 'world-country' | 'country'
  resources: DataResource[]
  defaultScope?: string
  defaultLength?: 'all'
  kind?: 'profile' | 'city-recall'
  content?: Content[]
  targetType?: Entity['type']
  language?: string
  europeMap?: boolean
  minPool?: number
  collections?: Array<{ id: string; title: string; generators: string[] }>
}
export const ANSWER_LABELS: Record<ModeForm, string> = {
  choice: 'Auswählen',
  input: 'Eintippen',
  map: 'Karte',
}

export const QUIZ_TOPICS: QuizTopic[] = [
  {
    id: 'flags',
    title: 'Flaggen',
    description: 'Länderflaggen erkennen und auswählen',
    icon: 'flag',
    featured: true,
  },
  {
    id: 'countries',
    title: 'Länder & Karten',
    description: 'Länderwissen, Nachbarn und Weltkarte',
    icon: 'map',
    featured: true,
  },
  {
    id: 'capitals',
    title: 'Hauptstädte',
    description: 'Hauptstädte kennen und zuordnen',
    icon: 'landmark',
    featured: true,
  },
  {
    id: 'regions',
    title: 'Regionen',
    description: 'Regionalflaggen, Karten und Hauptstädte',
    icon: 'compass',
    featured: false,
  },
  {
    id: 'cities',
    title: 'Städte',
    description: 'Großstädte, Einwohner und Stadtfotos',
    icon: 'building',
    featured: true,
  },
  {
    id: 'landmarks',
    title: 'Orte & Bilder',
    description: 'Sehenswürdigkeiten und Orte erkennen',
    icon: 'camera',
    featured: true,
  },
  {
    id: 'water',
    title: 'Flüsse & Seen',
    description: 'Flüsse und Seen zuordnen und vergleichen',
    icon: 'waves',
    featured: false,
  },
  {
    id: 'nature',
    title: 'Berge & Natur',
    description: 'Berge zuordnen und Höhen vergleichen',
    icon: 'mountain',
    featured: false,
  },
  {
    id: 'languages',
    title: 'Schriften',
    description: 'Griechisch und Kyrillisch lesen',
    icon: 'languages',
    featured: false,
  },
  {
    id: 'license_plates',
    title: 'Kennzeichen',
    description: 'Kennzeichen und ihre Orte',
    icon: 'car',
    featured: false,
  },
  {
    id: 'trivia',
    title: 'Wissensfragen',
    description: 'Wissensfragen aus aller Welt',
    icon: 'lightbulb',
    featured: true,
  },
  {
    id: 'mixed',
    title: 'Gemischte Runde',
    description: 'Eine Runde mit verschiedenen Themen',
    icon: 'dice',
    featured: false,
  },
]

export const EXERCISES: Exercise[] = [
  {
    id: 'city-recall',
    topic: 'cities',
    title: 'Städte auf der Karte sammeln',
    description: 'Tippe Städtenamen eines Landes ein und fülle die Karte.',
    variants: { input: ['city_recall'] },
    scope: 'country',
    resources: [],
    kind: 'city-recall',
    defaultScope: 'country:DE',
    defaultLength: 'all',
  },
  {
    id: 'country-flags',
    topic: 'flags',
    title: 'Länderflaggen erkennen',
    description: 'Erkenne das Land an seiner Flagge.',
    variants: {
      choice: ['flag_to_country'],
      input: ['flag_to_country_input'],
      map: ['flag_to_country_map'],
    },
    scope: 'world',
    resources: [],
    content: ['country'],
  },
  {
    id: 'choose-flag',
    topic: 'flags',
    title: 'Passende Flagge wählen',
    description: 'Wähle die Flagge zum genannten Land.',
    variants: {
      choice: ['country_to_flag'],
    },
    scope: 'world',
    resources: [],
    content: ['country'],
  },
  {
    id: 'country-profile',
    topic: 'countries',
    title: 'Länderprofil ausfüllen',
    description: 'Ein Land, fünf Kategorien. Richtige Eingaben werden automatisch übernommen.',
    variants: {
      input: ['country_profile'],
    },
    scope: 'world',
    resources: ['cities', 'relationships'],
    kind: 'profile',
    defaultLength: 'all',
  },
  {
    id: 'country-map',
    topic: 'countries',
    title: 'Länder auf der Karte finden',
    description: 'Finde das genannte Land auf der Weltkarte.',
    variants: {
      map: ['country_on_map'],
    },
    scope: 'world',
    resources: ['cities', 'relationships'],
  },
  {
    id: 'neighbors',
    topic: 'countries',
    title: 'Nachbarländer kennen',
    description: 'Welche Länder haben eine gemeinsame Grenze?',
    variants: {
      choice: ['neighbor_of_country'],
    },
    scope: 'world',
    resources: ['cities', 'relationships'],
  },
  {
    id: 'country-knowledge',
    topic: 'countries',
    title: 'Länderwissen testen',
    description: 'Währungen, Kontinente und Länderfakten.',
    variants: {
      choice: ['country_attribute', 'country_true_false'],
    },
    scope: 'world',
    resources: ['cities', 'relationships'],
  },
  {
    id: 'country-size',
    topic: 'countries',
    title: 'Länder vergleichen',
    description: 'Vergleiche Fläche und Einwohnerzahlen.',
    variants: {
      choice: ['country_comparison'],
    },
    scope: 'world',
    resources: ['cities', 'relationships'],
    minPool: 2,
  },
  {
    id: 'country-codes',
    topic: 'countries',
    title: 'Ländercodes zuordnen',
    description: 'ISO-Kürzel und Telefonvorwahlen zuordnen.',
    variants: {
      choice: ['country_code'],
    },
    scope: 'world',
    resources: ['cities', 'relationships'],
  },
  {
    id: 'national-symbols',
    topic: 'countries',
    title: 'Nationalsymbole erkennen',
    description: 'Tiere, Pflanzen und andere nationale Symbole.',
    variants: {
      choice: ['national_animal', 'national_flower', 'national_bird', 'national_tree'],
    },
    scope: 'world',
    resources: ['cities', 'relationships'],
  },
  {
    id: 'name-capital',
    topic: 'capitals',
    title: 'Hauptstädte nennen',
    description: 'Nenne die Hauptstadt des vorgegebenen Landes.',
    variants: {
      choice: ['country_to_capital'],
      input: ['capital_input'],
    },
    scope: 'world',
    resources: ['cities', 'relationships'],
  },
  {
    id: 'capital-country',
    topic: 'capitals',
    title: 'Hauptstadt dem Land zuordnen',
    description: 'Zu welchem Land gehört diese Hauptstadt?',
    variants: {
      choice: ['capital_to_country'],
    },
    scope: 'world',
    resources: ['cities', 'relationships'],
  },
  {
    id: 'capital-flag',
    topic: 'capitals',
    title: 'Flagge zur Hauptstadt finden',
    description: 'Wähle die Länderflagge zur Hauptstadt.',
    variants: {
      choice: ['capital_to_flag'],
    },
    scope: 'world',
    resources: ['cities', 'relationships'],
  },
  {
    id: 'regional-flags',
    topic: 'regions',
    title: 'Regionalflaggen erkennen',
    description: 'Erkenne eine Region an ihrer Flagge.',
    variants: {
      choice: ['flag_to_region'],
      input: ['region_flag_input'],
      map: ['flag_to_region_map'],
    },
    scope: 'country',
    resources: ['regions', 'cities', 'relationships'],
    defaultScope: 'country:DE',
    europeMap: true,
  },
  {
    id: 'choose-region-flag',
    topic: 'regions',
    title: 'Passende Regionalflagge wählen',
    description: 'Wähle die Flagge zur genannten Region.',
    variants: {
      choice: ['region_to_flag'],
    },
    scope: 'country',
    resources: ['regions', 'cities', 'relationships'],
    defaultScope: 'country:DE',
  },
  {
    id: 'region-country',
    topic: 'regions',
    title: 'Regionen dem Land zuordnen',
    description: 'Zu welchem Land gehört die Region?',
    variants: {
      choice: ['region_to_country', 'region_flag_to_country'],
    },
    scope: 'world',
    resources: ['regions', 'cities', 'relationships'],
  },
  {
    id: 'region-capitals',
    topic: 'regions',
    title: 'Regionalhauptstädte kennen',
    description: 'Welche Hauptstadt gehört zu dieser Region?',
    variants: {
      choice: ['region_capital'],
    },
    scope: 'country',
    resources: ['regions', 'cities', 'relationships'],
    defaultScope: 'country:DE',
  },
  {
    id: 'region-map',
    topic: 'regions',
    title: 'Regionen auf der Karte finden',
    description: 'Finde die Region auf der Karte ihres Landes.',
    variants: {
      map: ['region_on_map'],
    },
    scope: 'country',
    resources: ['regions', 'cities', 'relationships'],
    defaultScope: 'country:DE',
  },
  {
    id: 'large-cities',
    topic: 'cities',
    title: 'Städte einem Land zuordnen',
    description: 'Ordne Großstädte über 300.000 Einwohner ihrem Land zu.',
    variants: {
      choice: ['large_city_to_country'],
    },
    scope: 'world',
    resources: ['cities', 'regions'],
    collections: [
      {
        id: 'over_300k',
        title: 'Über 300.000 Einwohner',
        generators: ['large_city_to_country'],
      },
      {
        id: 'all_cities',
        title: 'Alle vorhandenen Städte',
        generators: ['city_to_country'],
      },
    ],
  },
  {
    id: 'city-region',
    topic: 'cities',
    title: 'Städte einer Region zuordnen',
    description: 'Zu welcher Region oder welchem Bundesland gehört die Stadt?',
    variants: {
      choice: ['city_to_region'],
    },
    scope: 'country',
    resources: ['cities', 'regions'],
    defaultScope: 'country:DE',
  },
  {
    id: 'city-size',
    topic: 'cities',
    title: 'Städtegrößen vergleichen',
    description: 'Welche der beiden Städte hat mehr Einwohner?',
    variants: {
      choice: ['city_population'],
    },
    scope: 'world-country',
    resources: ['cities', 'regions'],
    minPool: 2,
  },
  {
    id: 'city-photo',
    topic: 'cities',
    title: 'Städte am Foto erkennen',
    description: 'Erkenne Städte auf Fotos.',
    variants: {
      choice: ['image_to_city'],
    },
    scope: 'world-country',
    resources: ['cities', 'regions'],
  },
  {
    id: 'landmark-photo',
    topic: 'landmarks',
    title: 'Sehenswürdigkeiten erkennen',
    description: 'Erkenne die Sehenswürdigkeit auf dem Foto.',
    variants: {
      choice: ['image_to_landmark'],
      input: ['image_to_landmark_input'],
    },
    scope: 'world-country',
    resources: ['landmarks', 'cities', 'relationships'],
  },
  {
    id: 'landmark-country',
    topic: 'landmarks',
    title: 'Sehenswürdigkeiten dem Land zuordnen',
    description: 'In welchem Land liegt die Sehenswürdigkeit?',
    variants: {
      choice: ['landmark_to_country'],
      input: ['landmark_to_country_input'],
    },
    scope: 'world',
    resources: ['landmarks', 'cities', 'relationships'],
  },
  {
    id: 'landmark-city',
    topic: 'landmarks',
    title: 'Sehenswürdigkeiten dem Ort zuordnen',
    description: 'In welcher Stadt liegt die Sehenswürdigkeit?',
    variants: {
      choice: ['landmark_to_city'],
    },
    scope: 'world-country',
    resources: ['landmarks', 'cities', 'relationships'],
  },
  {
    id: 'country-photo',
    topic: 'landmarks',
    title: 'Länder am Foto erkennen',
    description: 'Erkenne das Land anhand eines Fotos.',
    variants: {
      choice: ['image_to_country'],
    },
    scope: 'world',
    resources: ['landmarks', 'cities', 'relationships'],
  },
  {
    id: 'river-country',
    topic: 'water',
    title: 'Flüsse zuordnen',
    description: 'Durch welches Land fließt dieser Fluss?',
    variants: {
      choice: ['river_to_country'],
      map: ['water_on_map'],
    },
    scope: 'world',
    resources: ['rivers', 'lakes'],
    targetType: 'river',
  },
  {
    id: 'lake-country',
    topic: 'water',
    title: 'Seen zuordnen',
    description: 'In welchem Land liegt dieser See?',
    variants: {
      choice: ['lake_to_country'],
      map: ['water_on_map'],
    },
    scope: 'world',
    resources: ['rivers', 'lakes'],
    targetType: 'lake',
  },
  {
    id: 'river-length',
    topic: 'water',
    title: 'Flusslängen vergleichen',
    description: 'Welcher Fluss ist länger?',
    variants: {
      choice: ['river_longer'],
    },
    scope: 'world-country',
    resources: ['rivers', 'lakes'],
    minPool: 2,
  },
  {
    id: 'lake-size',
    topic: 'water',
    title: 'Seegrößen vergleichen',
    description: 'Welcher See ist größer?',
    variants: {
      choice: ['lake_larger'],
    },
    scope: 'world-country',
    resources: ['rivers', 'lakes'],
    minPool: 2,
  },
  {
    id: 'mountain-country',
    topic: 'nature',
    title: 'Berge zuordnen',
    description: 'In welchem Land liegt dieser Berg?',
    variants: {
      choice: ['mountain_to_country'],
      map: ['mountain_on_map'],
    },
    scope: 'world',
    resources: ['mountains'],
  },
  {
    id: 'mountain-height',
    topic: 'nature',
    title: 'Berghöhen vergleichen',
    description: 'Welcher Berg ist höher?',
    variants: {
      choice: ['mountain_higher'],
    },
    scope: 'world-country',
    resources: ['mountains'],
    minPool: 2,
  },
  {
    id: 'read-cyrillic',
    topic: 'languages',
    title: 'Kyrillisch lesen',
    description: 'Lies kyrillische Zeichen und Wörter in lateinischer Umschrift.',
    variants: {
      choice: ['cyrillic_to_latin'],
      input: ['script_to_latin_input'],
    },
    scope: 'none',
    resources: ['scriptWords'],
    language: 'ru',
  },
  {
    id: 'read-greek',
    topic: 'languages',
    title: 'Griechisch lesen',
    description: 'Lies griechische Zeichen und Wörter in lateinischer Umschrift.',
    variants: {
      choice: ['greek_to_latin'],
      input: ['script_to_latin_input'],
    },
    scope: 'none',
    resources: ['scriptWords'],
    language: 'el',
  },
  {
    id: 'recognize-script',
    topic: 'languages',
    title: 'Schriftzeichen wiederfinden',
    description: 'Wähle die passende griechische oder kyrillische Schreibweise.',
    variants: {
      choice: ['latin_to_script'],
    },
    scope: 'none',
    resources: ['scriptWords'],
  },
  {
    id: 'plate-place',
    topic: 'license_plates',
    title: 'Kennzeichen einem Ort zuordnen',
    description: 'Zu welchem Ort gehört dieses Kennzeichen?',
    variants: {
      choice: ['plate_to_city'],
      input: ['plate_input'],
    },
    scope: 'country',
    resources: ['plates', 'regions'],
    defaultScope: 'country:DE',
  },
  {
    id: 'place-plate',
    topic: 'license_plates',
    title: 'Kennzeichen zum Ort finden',
    description: 'Welches Kennzeichen gehört zum Ort?',
    variants: {
      choice: ['city_to_plate'],
      input: ['city_to_plate_input'],
    },
    scope: 'country',
    resources: ['plates', 'regions'],
    defaultScope: 'country:DE',
  },
  {
    id: 'plate-region',
    topic: 'license_plates',
    title: 'Kennzeichen einer Region zuordnen',
    description: 'Zu welcher Region gehört das Kennzeichen?',
    variants: {
      choice: ['plate_to_region'],
    },
    scope: 'country',
    resources: ['plates', 'regions'],
    defaultScope: 'country:DE',
  },
  {
    id: 'geography-trivia',
    topic: 'trivia',
    title: 'Geografie-Wissensfragen',
    description: 'Beantworte abwechslungsreiche Geographiefragen.',
    variants: {
      choice: ['geography_trivia'],
    },
    scope: 'world',
    resources: ['trivia'],
  },
  {
    id: 'mixed-round',
    topic: 'mixed',
    title: 'Eine gemischte Runde spielen',
    description: 'Auswahlfragen aus verschiedenen Themen, ohne weitere Fragetyp-Auswahl.',
    variants: {
      choice: [],
    },
    scope: 'world',
    resources: [
      'cities',
      'relationships',
      'regions',
      'landmarks',
      'rivers',
      'lakes',
      'mountains',
      'scriptWords',
      'plates',
      'trivia',
    ],
  },
]

export const topicFor = (id: string) => QUIZ_TOPICS.find((t) => t.id === id)
export const exercisesFor = (topic: string) => EXERCISES.filter((q) => q.topic === topic)
export const exerciseFor = (id?: string) => EXERCISES.find((q) => q.id === id)
export const exercisePath = (q: Exercise) => '/play/' + q.topic + '?quiz=' + q.id
export function exerciseGenerators(q: Exercise, form: string, collection?: string, scope?: string): string[] {
  if (q.europeMap && form === 'map' && scope === 'europe') return ['flag_to_europe_map']
  if (q.collections) return (q.collections.find((c) => c.id === collection) ?? q.collections[0]).generators
  return q.variants[form as ModeForm] ?? []
}
export function exerciseKeeps(q: Exercise, entity: Entity): boolean {
  return (
    (!q.targetType || entity.type === q.targetType) &&
    (!q.language || entity.attributes.language === q.language)
  )
}
export function exerciseScopeAllowed(q: Exercise, scope: string, form: string): boolean {
  if (q.scope === 'none') return scope === 'world'
  if (q.scope === 'country')
    return /^country:[A-Z]{2}$/.test(scope) || !!(q.europeMap && form === 'map' && scope === 'europe')
  return !scope.startsWith('country:') || q.scope === 'world-country'
}
/** A mixed round contains only choice exercises; repeated generator IDs are removed. */
export function mixedExerciseGenerators() {
  return [
    ...new Set(EXERCISES.filter((q) => q.topic !== 'mixed').flatMap((q) => q.variants.choice ?? [])),
  ].filter((id) => id !== 'region_to_flag' && id !== 'city_to_country')
}
