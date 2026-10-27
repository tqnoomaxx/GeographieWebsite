import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Building2,
  Car,
  Camera,
  Dices,
  Flag,
  Globe2,
  Map as FoldedMap,
  Landmark,
  Languages,
  Lightbulb,
  Mountain,
  Waves,
} from 'lucide-react'
import { PLAY_QUIZZES } from '@/config/quizzes'
import type { CategoryId } from '@/engine/types'

export const QUIZ_COPY: Partial<Record<CategoryId, string>> = {
  flags: 'Flaggen erkennen und zuordnen',
  capitals: 'Von Berlin bis Buenos Aires',
  cities: 'Großstädte über 300.000 Einwohner',
  countries: 'Länder, Karten und Nachbarn',
  landmarks: 'Berühmte Orte auf Bildern erkennen',
  trivia: 'Spannende Fragen aus aller Welt',
  languages: 'Griechisch und Kyrillisch lesen lernen',
  nature: 'Berge, Gipfel und Natur entdecken',
  water: 'Flüsse und Seen kennenlernen',
  license_plates: 'Kennzeichen ihren Orten zuordnen',
  mixed: 'Eine bunte Mischung aus allen Themen',
}
const TOPIC_ICONS = {
  flags: Flag,
  capitals: Landmark,
  cities: Building2,
  countries: FoldedMap,
  landmarks: Camera,
  trivia: Lightbulb,
  languages: Languages,
  nature: Mountain,
  water: Waves,
  license_plates: Car,
  mixed: Dices,
}
export const FEATURED_TOPICS: CategoryId[] = [
  'flags',
  'capitals',
  'cities',
  'countries',
  'landmarks',
  'trivia',
]
const ALL_TOPICS = [
  ...FEATURED_TOPICS,
  'languages',
  'nature',
  'water',
  'license_plates',
  'mixed',
] as CategoryId[]

export function TopicIcon({ id }: { id: CategoryId }) {
  const Icon = TOPIC_ICONS[id as keyof typeof TOPIC_ICONS] ?? Globe2
  return (
    <span className={`topic-icon topic-icon-${id}`}>
      <Icon aria-hidden strokeWidth={1.6} />
    </span>
  )
}

/** Ein gemeinsamer, vollständig per Tastatur bedienbarer Einstieg auf Start- und Quizseite. */
export function QuizCatalog({ featured = false }: { featured?: boolean }) {
  const { t } = useTranslation()
  const topics = (featured ? FEATURED_TOPICS : ALL_TOPICS).filter((id) =>
    PLAY_QUIZZES.some((q) => q.id === id),
  )
  return (
    <nav className="topic-list" aria-label="Quizthemen">
      {topics.map((id) => (
        <Link key={id} to={`/play/${id}`} className="topic-link" data-quiz-topic={id}>
          <TopicIcon id={id} />
          <span className="topic-copy">
            <strong>{t(`category.${id}`)}</strong>
            <small>{QUIZ_COPY[id]}</small>
          </span>
          <ArrowRight className="topic-arrow" aria-hidden />
        </Link>
      ))}
    </nav>
  )
}
