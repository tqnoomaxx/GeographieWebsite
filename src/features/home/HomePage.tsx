import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import { resourcesForQuiz } from '@/app/dataRequirements'
import { defaultRound, roundPath } from '@/engine/round'
import { AUTO, MIN_POOL, PLAY_QUIZZES } from '@/config/quizzes'
import { poolFor } from '@/engine/session'
import { QuizCatalog } from '@/features/play/QuizCatalog'
import { OpenRounds } from '@/features/play/OpenRounds'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { Flag, Page } from '@/ui'
import { CategoryIconTile, Icons } from '@/ui/icons'
import type { Country } from '@/domain/types'
import './home.css'
const InteractiveGlobe = lazy(() =>
  import('./InteractiveGlobe').then((m) => ({ default: m.InteractiveGlobe })),
)

function CountryQuizPanel({
  country,
  availableCountryQuizIds,
  loading,
  onClose,
}: {
  country: Country
  availableCountryQuizIds: Set<string>
  loading: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const countryQuizzes = PLAY_QUIZZES.filter(
    (quiz) => quiz.perCountry && availableCountryQuizIds.has(quiz.id),
  )
  const globalQuizzes = PLAY_QUIZZES.filter((quiz) => !quiz.perCountry)
  const iso2 = country.attributes.iso2

  return (
    <section className="country-quiz-panel" aria-labelledby="country-quiz-title">
      <div className="country-quiz-identity">
        <Flag entity={country} size="md" />
        <div>
          <span className="atlas-label">Land ausgewählt</span>
          <h2 id="country-quiz-title">{country.names.de}</h2>
        </div>
        <button
          type="button"
          className="country-quiz-close"
          onClick={onClose}
          aria-label="Länderauswahl schließen"
        >
          <Icons.x aria-hidden />
        </button>
        <Link to={`/country/${encodeURIComponent(iso2)}`} className="country-detail-link">
          Land entdecken <span aria-hidden>↗</span>
        </Link>
      </div>

      <div className="country-quiz-groups">
        <div>
          <h3>In diesem Land</h3>
          <p>Das Land ist in der Konfiguration bereits vorausgewählt.</p>
          {loading ? (
            <div className="country-quiz-loading" role="status">
              Passende Quizze werden geladen …
            </div>
          ) : countryQuizzes.length ? (
            <div className="country-quiz-links">
              {countryQuizzes.map((quiz) => (
                <Link key={quiz.id} to={`/play/${quiz.id}?scope=${encodeURIComponent(country.id)}`}>
                  <CategoryIconTile id={quiz.id} size="sm" />
                  <span>{t(`category.${quiz.id}`)}</span>
                  <Icons.arrow aria-hidden />
                </Link>
              ))}
            </div>
          ) : (
            <p className="country-quiz-empty">
              Für dieses Land sind noch nicht genug Detailfragen vorhanden.
            </p>
          )}
        </div>

        <div className="country-quiz-global">
          <h3>Weltweite Quizze</h3>
          <p>Diese Kategorien werden unabhängig vom ausgewählten Land gespielt.</p>
          <div className="country-quiz-links">
            {globalQuizzes.map((quiz) => (
              <Link key={quiz.id} to={`/play/${quiz.id}`}>
                <CategoryIconTile id={quiz.id} size="sm" />
                <span>{t(`category.${quiz.id}`)}</span>
                <Icons.arrow aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  useDocumentTitle()
  const geo = useGeoData()
  const [selectedCountryId, setSelectedCountryId] = useState<string>()
  const [quizAvailabilityLoading, setQuizAvailabilityLoading] = useState(false)
  const [quizAvailabilityError, setQuizAvailabilityError] = useState(false)
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0)
  const selectedCountry = selectedCountryId
    ? (geo.byId.get(selectedCountryId) as Country | undefined)
    : undefined

  useEffect(() => {
    if (!selectedCountryId) {
      setQuizAvailabilityLoading(false)
      return
    }
    let active = true
    setQuizAvailabilityError(false)
    setQuizAvailabilityLoading(true)
    const resources = [
      ...new Set(
        PLAY_QUIZZES.filter((quiz) => quiz.perCountry && quiz.id !== 'mixed').flatMap((quiz) =>
          resourcesForQuiz(quiz.id),
        ),
      ),
    ]
    void geo
      .ensureResources(resources)
      .catch(() => {
        if (active) setQuizAvailabilityError(true)
      })
      .finally(() => {
        if (active) setQuizAvailabilityLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedCountryId, availabilityAttempt, geo.ensureResources])

  const availableCountryQuizIds = useMemo(() => {
    const available = new Set<string>()
    if (!selectedCountryId || !geo.ready) return available
    const context = geo.contextFor(selectedCountryId)
    for (const quiz of PLAY_QUIZZES) {
      if (!quiz.perCountry) continue
      if (quiz.needs?.includes('regions') && !geo.regionsLoaded) continue
      if (quiz.needs?.includes('plates') && !geo.platesLoaded) continue
      const content = quiz.content ? ['region' as const] : undefined
      if (poolFor(context, { category: quiz.id, mode: AUTO, content }).size >= MIN_POOL) {
        available.add(quiz.id)
      }
    }
    return available
  }, [geo, selectedCountryId])

  return (
    <Page wide>
      <section className="simple-hero home-atlas" aria-label="Interaktiver Weltatlas">
        <header className="home-atlas-heading">
          <div>
            <h1>Interaktiver Weltatlas</h1>
            <p>Land anklicken · Quiz auswählen</p>
          </div>
          <nav className="simple-hero-actions" aria-label="Direkt spielen">
            <Link className="btn-primary" to="/play">
              Quiz auswählen <ArrowRight aria-hidden />
            </Link>
            <Link
              className="btn-secondary"
              to={roundPath({ ...defaultRound('flags'), mode: 'flag_to_name', content: ['country'] })}
            >
              10 Flaggen spielen
            </Link>
          </nav>
        </header>
        <Suspense
          fallback={
            <div className="home-atlas-loading" role="status">
              Weltkugel wird geladen …
            </div>
          }
        >
          <InteractiveGlobe
            countries={geo.countries}
            selectedId={selectedCountryId}
            onSelect={setSelectedCountryId}
          />
        </Suspense>
      </section>
      {selectedCountry && quizAvailabilityError && (
        <div role="alert" className="card my-4 p-4">
          Passende Quizze konnten nicht geladen werden.{' '}
          <button className="btn-secondary" onClick={() => setAvailabilityAttempt((n) => n + 1)}>
            Erneut versuchen
          </button>
        </div>
      )}
      {selectedCountry && !quizAvailabilityError && (
        <CountryQuizPanel
          country={selectedCountry}
          availableCountryQuizIds={availableCountryQuizIds}
          loading={quizAvailabilityLoading}
          onClose={() => setSelectedCountryId(undefined)}
        />
      )}
      <OpenRounds />
      <section className="simple-topic-section">
        <header className="simple-section-heading">
          <h2>Worauf hast du Lust?</h2>
          <Link to="/play">
            Alle Themen <ArrowRight aria-hidden />
          </Link>
        </header>
        <QuizCatalog featured />
      </section>
      <section className="simple-daily-banner">
        <CalendarDays aria-hidden />
        <div>
          <h2>Jeden Tag eine neue Herausforderung.</h2>
          <p>Sechs Rätsel. Ein neuer Start, jeden Tag.</p>
        </div>
        <Link to="/daily" className="btn-primary">
          Zu den Tagesrätseln <ArrowRight aria-hidden />
        </Link>
      </section>
      <Link
        className="simple-trivia-link"
        to={roundPath({ ...defaultRound('trivia'), mode: 'trivia_questions' })}
      >
        Oder direkt 10 Trivia-Fragen spielen <ArrowRight aria-hidden />
      </Link>
    </Page>
  )
}
