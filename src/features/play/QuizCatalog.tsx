import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Car,
  Camera,
  Compass,
  Dices,
  Flag,
  Globe2,
  Map,
  Landmark,
  Languages,
  Lightbulb,
  Mountain,
  Waves,
} from 'lucide-react'
import { QUIZ_TOPICS, topicFor } from '@/config/quizCatalog'
import type { CategoryId } from '@/engine/types'
const ICONS = {
  flag: Flag,
  map: Map,
  landmark: Landmark,
  compass: Compass,
  building: Building2,
  camera: Camera,
  waves: Waves,
  mountain: Mountain,
  languages: Languages,
  car: Car,
  lightbulb: Lightbulb,
  dice: Dices,
}
export const QUIZ_COPY = Object.fromEntries(QUIZ_TOPICS.map((t) => [t.id, t.description]))
export const FEATURED_TOPICS = QUIZ_TOPICS.filter((t) => t.featured).map((t) => t.id)
export function TopicIcon({ id }: { id: CategoryId }) {
  const name = topicFor(id)?.icon
  const Icon = ICONS[name as keyof typeof ICONS] ?? Globe2
  return (
    <span className={'topic-icon topic-icon-' + id}>
      <Icon aria-hidden strokeWidth={1.6} />
    </span>
  )
}
export function QuizCatalog({ featured = false }: { featured?: boolean }) {
  const topics = featured ? QUIZ_TOPICS.filter((t) => t.featured) : QUIZ_TOPICS
  return (
    <nav className="topic-list" aria-label="Quizthemen">
      {topics.map((topic) => (
        <Link key={topic.id} to={'/play/' + topic.id} className="topic-link" data-quiz-topic={topic.id}>
          <TopicIcon id={topic.id} />
          <span className="topic-copy">
            <strong>{topic.title}</strong>
            <small>{topic.description}</small>
          </span>
          <ArrowRight className="topic-arrow" aria-hidden />
        </Link>
      ))}
    </nav>
  )
}
