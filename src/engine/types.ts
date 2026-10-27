import type { Entity } from '@/domain/types'

export type QuestionType =
  | 'profile_input'
  | 'multiple_choice'
  | 'text_input'
  | 'map_click'
  | 'image_choice'
  | 'ordering'
  | 'true_false'
  | 'flashcard'

export type CategoryId =
  | 'flags'
  | 'countries'
  | 'capitals'
  | 'regions'
  | 'cities'
  | 'maps'
  | 'landmarks'
  | 'images'
  | 'license_plates'
  | 'languages'
  | 'water'
  | 'nature'
  | 'trivia'
  | 'mixed'

export interface QuestionOption {
  id: string
  label: string
  image?: string
}

export interface ProfileField {
  id: string
  label: string
  answers: string[]
  display: string
  normalization?: 'text' | 'code' | 'domain'
}

export interface Question {
  id: string
  category: CategoryId
  type: string // Generator-Kennung, z. B. flag_to_country
  question_type: QuestionType
  prompt: { key: string; params?: Record<string, string | number> }
  answer: string // Entity-ID oder Wert
  accepted?: string[] // für text_input
  profileFields?: ProfileField[]
  place?: {name:string;lat:number;lon:number;population:number;geonameId:string}
  options?: QuestionOption[]
  media?: {
    kind: 'flag' | 'photo' | 'outline'
    url?: string
    alt: string
    attribution?: string
    source_url?: string
    entityId?: string
  }
  map?: { kind: 'world' | 'region' | 'europe'; iso2?: string; targetId: string }
  difficulty: number // 1..3
  entities: string[] // beteiligte Entities für Progress
  explanation?: string
  /** Kurze Lernfakten, die nach der Antwort sichtbar werden. */
  facts?: string[]
  sources?: Array<{ label: string; url: string }>
  metadata: { generator: string; scope: string }
}

export interface GeneratorContext {
  countries: Entity[]
  cities: Entity[]
  landmarks: Entity[]
  regions: Entity[]
  plates: Entity[]
  rivers: Entity[]
  lakes: Entity[]
  mountains: Entity[]
  scriptWords: Entity[]
  trivia: Entity[]
  byId: Map<string, Entity>
  rel: {
    capitalOf: Map<string, string> // city → country/region
    capitalCity: Map<string, string> // country/region → city
    capitalCities: Map<string, string[]> // country/region → all current capitals
    locatedIn: Map<string, string[]> // entity → container ids
    neighbors: Map<string, string[]>
  }
  scope: string
}

export interface AnswerResult {
  correct: boolean
  correctLabel: string
  givenLabel?: string
}
