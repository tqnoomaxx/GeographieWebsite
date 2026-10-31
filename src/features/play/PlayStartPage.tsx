import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useGeoData } from '@/app/DataProvider'
import { CountryQuizPanel } from './CountryQuizPanel'
import { useDocumentTitle } from '@/app/hooks'
import { isCategory } from '@/config/quizzes'
import { exerciseFor, exercisePath, exercisesFor } from '@/config/quizCatalog'
import { Page } from '@/ui'
import { Icons } from '@/ui/icons'
import { ArrowRight, Map as MapIcon } from 'lucide-react'
import { QuizCatalog } from './QuizCatalog'
import { OpenRounds } from './OpenRounds'
import { ExerciseList, ExerciseSetup, legacyExercise } from './ExerciseSetup'

export default function PlayStartPage() {
  const { category } = useParams<{ category?: string }>()
  const [params] = useSearchParams()
  if (!category) return <CategoryHub />
  if (!isCategory(category)) return <Navigate to="/play" replace />
  const exercise = exerciseFor(params.get('quiz') ?? undefined)
  if (exercise?.topic === category)
    return <ExerciseSetup key={exercise.id + params.toString()} exercise={exercise} />
  const legacy = legacyExercise(category, params.get('mode'), params.get('scope'), params.get('content'))
  if (legacy) {
    const next = new URLSearchParams({ quiz: legacy.exercise.id, mode: legacy.form })
    if (legacy.scope ?? params.get('scope')) next.set('scope', legacy.scope ?? params.get('scope')!)
    return <Navigate to={'/play/' + legacy.exercise.topic + '?' + next} replace />
  }
  if (category === 'maps') return <Navigate to={exercisePath(exerciseFor('country-map')!)} replace />
  if (category === 'images') return <Navigate to="/play/landmarks" replace />
  if (params.has('scope') && exercisesFor(category).length) {
    const chosen =
      category === 'flags' && params.get('scope')?.startsWith('country:')
        ? exerciseFor('regional-flags')!
        : exercisesFor(category)[0]
    return (
      <Navigate to={exercisePath(chosen) + '&scope=' + encodeURIComponent(params.get('scope')!)} replace />
    )
  }
  return <ExerciseList category={category} />
}

function CategoryHub() {
  const [params] = useSearchParams()
  const geo = useGeoData()
  const country = geo.countries.find((country) => country.id === params.get('scope'))
  useDocumentTitle(country ? `Quizze für ${country.names.de}` : 'Quiz auswählen')
  if (params.get('view') === 'diorama') return <Navigate to="/story" replace />
  if (country)
    return (
      <Page wide>
        <header className="simple-page-heading">
          <h1>Quizze für {country.names.de}</h1>
          <p>Wähle eine passende Übung für dein Land.</p>
        </header>
        <CountryQuizPanel key={country.id} country={country} />
      </Page>
    )
  return (
    <Page wide>
      <header className="simple-page-heading">
        <h1>Quiz auswählen</h1>
        <p>Wähle ein Thema und anschließend eine Übung.</p>
      </header>
      <OpenRounds />
      <QuizCatalog />
      <section className="simple-quiz-extras">
        <Link to="/daily">
          <Icons.daily aria-hidden />
          <span>
            <strong>Lieber ein Tagesrätsel?</strong>
            <small>Jeden Tag sechs neue Herausforderungen.</small>
          </span>
          <ArrowRight aria-hidden />
        </Link>
        <Link to="/learn">
          <Icons.learn aria-hidden />
          <span>
            <strong>Erst einmal kennenlernen</strong>
            <small>Entdecke die Welt mit Lernkarten.</small>
          </span>
          <ArrowRight aria-hidden />
        </Link>
      </section>
      <Link to="/story" className="diorama-entry">
        <MapIcon aria-hidden />
        <span>Die falsche Route · Löse geografische Fälle im Ermittlungsbüro</span>
        <ArrowRight aria-hidden />
      </Link>
    </Page>
  )
}
