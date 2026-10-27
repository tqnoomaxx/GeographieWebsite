import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useDataResources, useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import {
  ANSWER_LABELS,
  EXERCISES,
  exerciseFor,
  exercisePath,
  exercisesFor,
  topicFor,
  type Exercise,
} from '@/config/quizCatalog'
import { modeFor, type ModeForm } from '@/config/quizzes'
import { poolFor } from '@/engine/session'
import { roundPath, type RoundConfig } from '@/engine/round'
import { SCOPES } from '@/engine/scope'
import { selectedProfileIds, PROFILE_CATEGORIES } from '@/engine/profile'
import type { CategoryId } from '@/engine/types'
import { ErrorState, LoadingState, Page } from '@/ui'
import { TopicIcon } from './QuizCatalog'
import { CityRecallSetup } from './CityRecallSetup'
import { TrainingOptions, useTrainingSettings } from './TrainingOptions'
import './quiz-selection.css'

/** Old setup links resolve to one concrete exercise. Old round URLs still use the legacy engine. */
export function legacyExercise(
  category: CategoryId,
  mode: string | null,
  scope: string | null,
  content?: string | null,
) {
  if (!mode || mode === 'auto') return undefined
  const def = modeFor(category, mode)
  if (!def) return undefined
  if (category === 'cities' && mode === 'capital_input')
    return { exercise: exerciseFor('name-capital')!, form: 'input' }
  if (mode === 'europe_map') return { exercise: exerciseFor('regional-flags')!, form: 'map', scope: 'europe' }
  const regional =
    category === 'regions' ||
    (category === 'flags' && (!!scope?.startsWith('country:') || content === 'region'))
  const match = exercisesFor(
    regional ? 'regions' : category === 'maps' ? 'countries' : category === 'images' ? 'landmarks' : category,
  ).find((q) =>
    Object.values(q.variants)
      .flat()
      .some((g) => def.generators.includes(g)),
  )
  const resolved =
    match ??
    EXERCISES.find((q) =>
      Object.values(q.variants)
        .flat()
        .some((g) => def.generators.includes(g)),
    )
  if (resolved) return { exercise: resolved, form: def.form }
  return undefined
}
export function ExerciseList({ category }: { category: CategoryId }) {
  const topic = topicFor(category)!
  const exercises = exercisesFor(category)
  useDocumentTitle(topic.title)
  if (exercises.length === 1) return <ExerciseSetup exercise={exercises[0]} />
  return (
    <Page>
      <div className="exercise-page">
        <Link to="/play" className="simple-back">
          <ArrowLeft aria-hidden />
          Alle Themen
        </Link>
        <header className="exercise-heading">
          <TopicIcon id={category} />
          <div>
            <h1>{topic.title}</h1>
            <p>Was möchtest du üben?</p>
          </div>
        </header>
        <nav className="exercise-list" aria-label="Übungen">
          {exercises.map((q) => (
            <Link className="exercise-link" key={q.id} to={exercisePath(q)} data-exercise={q.id}>
              <span>
                <strong>{q.title}</strong>
                <small>{q.description}</small>
              </span>
              <ArrowRight aria-hidden />
            </Link>
          ))}
        </nav>
      </div>
    </Page>
  )
}
export function ExerciseSetup({exercise}:{exercise:Exercise}) {
  return exercise.kind==='city-recall'?<CityRecallSetup exercise={exercise}/>:<StandardExerciseSetup exercise={exercise}/>
}
function StandardExerciseSetup({ exercise: q }: { exercise: Exercise }) {
  const { t } = useTranslation()
  const geo = useGeoData()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const resources = useDataResources(['index', 'countries', ...q.resources])
  const [training, changeTraining] = useTrainingSettings()
  const [form, setForm] = useState<ModeForm>(() =>
    params.get('mode') && q.variants[params.get('mode') as ModeForm]
      ? (params.get('mode') as ModeForm)
      : (Object.keys(q.variants)[0] as ModeForm),
  )
  const [chosenScope, setScope] = useState(params.get('scope') ?? q.defaultScope ?? 'world')
  const [collection, setCollection] = useState(
    () => q.collections?.find((c) => c.id === params.get('collection'))?.id ?? q.collections?.[0]?.id,
  )
  const [fields, setFields] = useState(() => selectedProfileIds(params.get('fields')?.split(',')))
  useDocumentTitle(q.title)
  const setupBase = {
    category: q.topic,
    exercise: q.id,
    mode: form,
    collection,
    fields: q.kind === 'profile' ? fields : undefined,
    content: q.content,
  }
  const minimum = q.kind === 'profile' || form !== 'choice' ? 1 : (q.minPool ?? 4)
  const available = useMemo(() => {
    if (resources.loading) return []
    const setup = { category: q.topic, exercise: q.id, mode: form, collection, content: q.content }
    const count = (scope: string) => poolFor(geo.contextFor(scope), setup).size
    if (q.scope === 'none') return [{ id: 'world', label: 'Welt' }]
    const scopes: Array<{ id: string; label: string }> = []
    if (q.scope !== 'country')
      for (const scope of SCOPES)
        if (count(scope) >= minimum) scopes.push({ id: scope, label: t(`scope.${scope}`) })
    if (q.europeMap && form === 'map' && count('europe') >= minimum)
      scopes.push({ id: 'europe', label: 'Europa – gemeinsame Regionenkarte' })
    if (q.scope === 'country' || q.scope === 'world-country') {
      const counts = new Map<string, number>()
      for (const { entity: e } of poolFor(geo.contextFor('world'), setup).values()) {
        const countries =
          (e.attributes.countries as string[] | undefined) ??
          (e.attributes.country ? [e.attributes.country] : [])
        for (const country of countries) counts.set(country, (counts.get(country) ?? 0) + 1)
      }
      for (const [id, n] of counts)
        if (n >= minimum) {
          const country = geo.byId.get(id)
          if (country) scopes.push({ id, label: country.names.de })
        }
      const start = q.scope === 'country' && q.europeMap && form === 'map' ? 1 : 0
      scopes.splice(
        start,
        scopes.length - start,
        ...scopes
          .slice(start)
          .sort((a, b) =>
            a.id.startsWith('country:') === b.id.startsWith('country:')
              ? a.id.startsWith('country:')
                ? a.label.localeCompare(b.label, 'de')
                : 0
              : a.id.startsWith('country:')
                ? 1
                : -1,
          ),
      )
    }
    return scopes
  }, [geo, q, form, collection, minimum, resources.loading, t])
  const scope = available.some((s) => s.id === chosenScope)
    ? chosenScope
    : (available.find((s) => s.id === q.defaultScope)?.id ?? available[0]?.id ?? 'world')
  const poolSize = useMemo(
    () => (resources.loading ? 0 : poolFor(geo.contextFor(scope), setupBase).size),
    [geo, scope, q, form, collection, resources.loading],
  )
  const wanted = q.defaultLength ?? training.length
  const length = wanted === 'all' || poolSize <= wanted ? 'all' : wanted
  const start = () => {
    const setup: RoundConfig = {
      ...setupBase,
      scope,
      length,
      repeat: q.kind === 'profile' ? false : training.repeat,
      hideFlagHints: q.topic === 'flags' && training.hideFlagHints,
    }
    navigate(roundPath(setup))
  }
  const topic = topicFor(q.topic)!
  const toggleField = (id: string) =>
    setFields((previous) => (previous.includes(id) ? previous.filter((f) => f !== id) : [...previous, id]))
  return (
    <Page>
      <div className="exercise-setup">
        <Link className="simple-back" to={exercisesFor(q.topic).length === 1 ? '/play' : `/play/${q.topic}`}>
          <ArrowLeft aria-hidden />
          {exercisesFor(q.topic).length === 1 ? 'Alle Themen' : topic.title}
        </Link>
        <header className="exercise-setup-heading">
          <h1>{q.title}</h1>
          <p>{q.description}</p>
        </header>
        {resources.error ? (
          <ErrorState onRetry={resources.retry} />
        ) : resources.loading ? (
          <LoadingState message="Übung wird geladen …" />
        ) : (
          <>
            {Object.keys(q.variants).length > 1 && (
              <fieldset className="exercise-control">
                <legend>Antworten</legend>
                <div className="answer-form-options">
                  {Object.keys(q.variants).map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={form === value}
                      className={form === value ? 'is-selected' : ''}
                      onClick={() => setForm(value as ModeForm)}
                    >
                      {ANSWER_LABELS[value as ModeForm]}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {q.collections && (
              <label className="exercise-control">
                Sammlung
                <select
                  aria-label="Sammlung"
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                >
                  {q.collections.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {q.scope !== 'none' && available.length > 1 && (
              <label className="exercise-control">
                {q.scope === 'country' ? 'Land' : 'Gebiet'}
                <select
                  aria-label={q.scope === 'country' ? 'Land' : 'Gebiet'}
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  {available.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {q.kind === 'profile' && (
              <details className="profile-category-options">
                <summary>
                  Fünf Kategorien auswählen <span>{fields.length} / 5</span>
                </summary>
                <div>
                  {PROFILE_CATEGORIES.map((c) => (
                    <label key={c.id}>
                      <input
                        type="checkbox"
                        checked={fields.includes(c.id)}
                        disabled={fields.length === 5 && !fields.includes(c.id)}
                        onChange={() => toggleField(c.id)}
                      />
                      {c.title}
                    </label>
                  ))}
                </div>
              </details>
            )}
            {q.kind === 'profile' && (
              <p className="exercise-note">
                Tippe in beliebiger Reihenfolge. Eine gültige Antwort pro Kategorie genügt. Vollständige
                Treffer werden automatisch übernommen.
              </p>
            )}
            <p className="exercise-summary" aria-live="polite">
              {poolSize.toLocaleString('de-DE')} {q.kind === 'profile' ? 'Länder' : 'Lernkarten'} ·{' '}
              {length === 'all' ? 'Alle' : `${length} ${q.kind === 'profile' ? 'Länder' : 'Fragen'}`}
              {q.scope === 'none' || available.length > 1
                ? ''
                : ` · ${available.find((s) => s.id === scope)?.label ?? scope}`}
            </p>
            {poolSize < minimum && (
              <p role="status">Für diese Auswahl sind noch nicht genügend Lernkarten vorhanden.</p>
            )}
            <button
              className="btn-primary exercise-start"
              type="button"
              disabled={poolSize < minimum || (q.kind === 'profile' && fields.length !== 5)}
              onClick={start}
            >
              Quiz starten
              <ArrowRight aria-hidden />
            </button>
            {q.kind !== 'profile' && (
              <TrainingOptions settings={training} onChange={changeTraining} flags={q.topic === 'flags'} />
            )}
          </>
        )}
      </div>
    </Page>
  )
}
