import { lazy, Suspense } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useDocumentTitle, useAsync } from '@/app/hooks'
import { useGeoData } from '@/app/DataProvider'
import { isCategory } from '@/config/quizzes'
import { exerciseFor, exercisePath, exercisesFor } from '@/config/quizCatalog'
import { getRepository } from '@/services/progress'
import { Page } from '@/ui'
import { Icons } from '@/ui/icons'
import { ArrowRight, Map as MapIcon } from 'lucide-react'
import { QuizCatalog } from './QuizCatalog'
import { OpenRounds } from './OpenRounds'
import { buildStationProgress } from './stationProgress'
import { ExerciseList, ExerciseSetup, legacyExercise } from './ExerciseSetup'
const PlayMapSwitcher = lazy(() => import('./PlayMapSwitcher').then((m) => ({ default: m.PlayMapSwitcher })))

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
  useDocumentTitle('Quiz auswählen')
  const geo = useGeoData()
  const [params] = useSearchParams()
  const directMap = params.get('view') === 'diorama'
  const { data: stationProgress } = useAsync(async () => {
    if (!directMap) return undefined
    const repo = getRepository()
    const [stats, puzzles] = await Promise.all([repo.getStats(), repo.getPuzzles()])
    return buildStationProgress(stats, puzzles)
  }, [directMap])
  return (
    <Page wide>
      <header className={directMap ? 'sr-only' : 'simple-page-heading'}>
        <h1>{directMap ? 'Deine Wissensinsel' : 'Quiz auswählen'}</h1>
        <p>
          {directMap
            ? 'Erkunde die Welt. Finde dein nächstes Quiz.'
            : 'Wähle ein Thema und anschließend eine Übung.'}
        </p>
      </header>
      <OpenRounds />
      {directMap && (
        <div className="diorama-direct-view">
          <Suspense fallback={<p role="status">Karte wird geladen …</p>}>
            <PlayMapSwitcher counts={geo.index?.counts} progress={stationProgress} />
          </Suspense>
        </div>
      )}
      {!directMap && <QuizCatalog />}
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
      {!directMap && (
        <Link to="/play?view=diorama" className="diorama-entry">
          <MapIcon aria-hidden />
          <span>Quizthemen auf der 3D-Karte ansehen</span>
          <ArrowRight aria-hidden />
        </Link>
      )}
      {directMap && (
        <Link to="/play" className="simple-back">
          Zur vollständigen Themenauswahl
        </Link>
      )}
    </Page>
  )
}
