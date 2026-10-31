import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import { usePageViewState } from '@/app/usePageViewState'
import { CountryQuizPanel } from '@/features/play/CountryQuizPanel'
import { defaultRound, roundPath } from '@/engine/round'
import { QuizCatalog } from '@/features/play/QuizCatalog'
import { OpenRounds } from '@/features/play/OpenRounds'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { Page } from '@/ui'
import './home.css'
const InteractiveGlobe = lazy(() =>
  import('./InteractiveGlobe').then((m) => ({ default: m.InteractiveGlobe })),
)

export default function HomePage() {
  useDocumentTitle()
  const geo = useGeoData()
  const [selectedCountryId, setSelectedCountryId] = usePageViewState<string | undefined>(
    'home.country',
    undefined,
  )
  const selectedCountry = selectedCountryId
    ? geo.countries.find((country) => country.id === selectedCountryId)
    : undefined

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
      {selectedCountry && (
        <CountryQuizPanel
          key={selectedCountry.id}
          country={selectedCountry}
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
