import { Link } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'
import type { Country } from '@/domain/types'
import { Flag } from '@/ui'
import { ANSWER_LABELS } from '@/config/quizCatalog'
import { TopicIcon } from './QuizCatalog'
import { useCountryExercises } from './useCountryExercises'
import type { CountryExercise } from '@/engine/countryExercises'
import './country-exercises.css'

export function CountryQuizPanel({ country, onClose }: { country: Country; onClose?: () => void }) {
  const { options, loading, failed, retry } = useCountryExercises(country.id)
  const groups = [
    { title: 'Land kennenlernen', items: options.filter((option) => option.exercise.kind === 'profile') },
    {
      title: 'Regionen, Städte & Orte',
      items: options.filter((option) => ['regions', 'cities', 'landmarks'].includes(option.exercise.topic)),
    },
    {
      title: 'Natur & Gewässer',
      items: options.filter((option) => ['nature', 'water'].includes(option.exercise.topic)),
    },
    { title: 'Kennzeichen', items: options.filter((option) => option.exercise.topic === 'license_plates') },
  ]
  const description = (option: CountryExercise) =>
    option.fields
      ? `${option.fields.length} Wissensfelder zu diesem Land`
      : option.minPopulation !== undefined
        ? `${option.count.toLocaleString('de-DE')} Städte über ${option.minPopulation.toLocaleString('de-DE')} Einwohnern`
        : `${option.count.toLocaleString('de-DE')} Lernkarten · ${ANSWER_LABELS[option.mode]}`
  const title = (option: CountryExercise) =>
    option.exercise.kind === 'profile'
      ? `${country.names.de} kennenlernen`
      : option.mode === 'map' && option.exercise.id === 'river-country'
        ? 'Flüsse auf der Karte finden'
        : option.mode === 'map' && option.exercise.id === 'lake-country'
          ? 'Seen auf der Karte finden'
          : option.mode === 'map' && option.exercise.id === 'mountain-country'
            ? 'Berge auf der Karte finden'
            : option.exercise.title
  return (
    <section
      className="country-quiz-panel country-exercise-panel"
      aria-label={`Quizze für ${country.names.de}`}
    >
      <header className="country-exercise-header">
        <div>
          <Flag entity={country} size="md" />
          <h2>{country.names.de}</h2>
        </div>
        <div className="country-exercise-actions">
          <Link to={`/country/${country.attributes.iso2}`}>
            Land entdecken
            <ArrowRight aria-hidden />
          </Link>
          {onClose && (
            <button type="button" aria-label="Länderauswahl schließen" onClick={onClose}>
              <X aria-hidden />
            </button>
          )}
        </div>
      </header>
      <p className="country-exercise-intro">
        In diesem Land: Übungen mit passenden Inhalten für {country.names.de}.
      </p>
      {groups
        .filter((group) => group.items.length)
        .map((group) => (
          <section key={group.title} className="country-exercise-group">
            <h3>{group.title}</h3>
            <div className="country-exercise-links">
              {group.items.map((option) => (
                <Link key={option.exercise.id} to={option.href} data-country-exercise={option.exercise.id}>
                  <TopicIcon id={option.exercise.topic} />
                  <span>
                    <strong>{title(option)}</strong>
                    <small>{description(option)}</small>
                  </span>
                  <ArrowRight aria-hidden />
                </Link>
              ))}
            </div>
          </section>
        ))}
      {loading && (
        <p className="country-exercise-status" role="status">
          Weitere passende Übungen werden geprüft …
        </p>
      )}
      {failed && (
        <div className="country-exercise-status" role="status">
          Einige Inhalte konnten nicht geladen werden.{' '}
          <button type="button" onClick={retry}>
            Erneut versuchen
          </button>
        </div>
      )}
      {!loading && !options.length && (
        <p className="country-exercise-status">
          Für dieses Gebiet sind derzeit keine passenden Quizdaten erfasst. Über „Land entdecken“ kannst du
          die vorhandenen Informationen ansehen.
        </p>
      )}
      <Link className="country-exercise-all" to="/play">
        Alle Quizthemen ansehen
        <ArrowRight aria-hidden />
      </Link>
    </section>
  )
}
