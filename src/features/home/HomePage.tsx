import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useStats, useDocumentTitle } from '@/app/hooks'
import { AUTO, MIN_POOL, PLAY_QUIZZES } from '@/config/quizzes'
import { baseQuestionPosition, baseQuestionTotal, poolFor, setupOf } from '@/engine/session'
import { RoundTitle } from '@/features/play/RoundLabel'
import { getRepository } from '@/services/progress'
import { Flag, Page, ProgressBar } from '@/ui'
import { CategoryIconTile, Icons, PUZZLE_ICONS } from '@/ui/icons'
import { PUZZLES } from '@/features/daily/puzzles'
import { todayKey } from '@/engine/rng'
import { BrandMark } from '@/ui/BrandMark'
import type { Country } from '@/domain/types'
import { InteractiveGlobe } from './InteractiveGlobe'

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
        <button type="button" className="country-quiz-close" onClick={onClose} aria-label="Länderauswahl schließen">
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
            <div className="country-quiz-loading" role="status">Passende Quizze werden geladen …</div>
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
            <p className="country-quiz-empty">Für dieses Land sind noch nicht genug Detailfragen vorhanden.</p>
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
  const { t } = useTranslation()
  useDocumentTitle()
  const geo = useGeoData()
  const { index } = geo
  const { stats, level } = useStats()
  const { data: open } = useAsync(() => getRepository().getOpenSessions(), [])
  const { data: puzzles } = useAsync(() => getRepository().getPuzzles(), [])
  const isNew = !stats || stats.answered === 0
  const today = todayKey()
  const primary = PLAY_QUIZZES.filter((c) => c.primary)
  const [selectedCountryId, setSelectedCountryId] = useState<string>()
  const [quizAvailabilityLoading, setQuizAvailabilityLoading] = useState(false)
  const selectedCountry = selectedCountryId
    ? (geo.byId.get(selectedCountryId) as Country | undefined)
    : undefined

  useEffect(() => {
    if (!selectedCountryId) {
      setQuizAvailabilityLoading(false)
      return
    }
    let active = true
    const pending: Promise<unknown>[] = []
    if (!geo.regionsLoaded) pending.push(geo.ensureRegions())
    if (!geo.platesLoaded) pending.push(geo.ensurePlates())
    if (!pending.length) {
      setQuizAvailabilityLoading(false)
      return
    }
    setQuizAvailabilityLoading(true)
    void Promise.allSettled(pending).then(() => {
      if (active) setQuizAvailabilityLoading(false)
    })
    return () => {
      active = false
    }
  }, [selectedCountryId]) // Die Ladefunktionen ändern ihre Identität mit dem Datenstand.

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
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="atlas-label"><BrandMark className="h-7 w-7" /> Atlas 01 · Wissen, das weiterführt</p>
          <h1>{isNew ? t('app.guest_hook') : t('app.tagline')}</h1>
          <p className="home-hero-sub">{t('app.hero_sub')}</p>
          <div className="home-hero-actions">
            <Link to="/play/flags/round?mode=auto&scope=world&len=10&content=country" className="btn-primary home-primary-cta">
              {t('app.play_now')} <Icons.arrow className="h-5 w-5" />
            </Link>
            <Link to="/learn" className="home-text-link">Erst die Welt kennenlernen <span>↗</span></Link>
          </div>
          {!isNew && stats && level && (
            <dl className="home-vitals">
              <div><dt>Serie</dt><dd>{stats.streak.current} Tage</dd></div>
              <div><dt>Niveau</dt><dd>Level {level.level}</dd></div>
              <div><dt>Modus</dt><dd>Lokal & privat</dd></div>
            </dl>
          )}
        </div>
        <div className="home-hero-map">
          <div className="home-globe-heading">
            <span>INTERAKTIVER ATLAS</span>
            <strong>Land anklicken · Quiz auswählen</strong>
          </div>
          <InteractiveGlobe
            countries={geo.countries}
            selectedId={selectedCountryId}
            onSelect={setSelectedCountryId}
          />
        </div>
      </section>

      {selectedCountry && (
        <CountryQuizPanel
          country={selectedCountry}
          availableCountryQuizIds={availableCountryQuizIds}
          loading={quizAvailabilityLoading}
          onClose={() => setSelectedCountryId(undefined)}
        />
      )}

      {open && open.length > 0 && (
        <section className="home-continue">
          <span className="atlas-index">WEITER</span>
          <div className="min-w-0 flex-1">
            <RoundTitle setup={setupOf(open[0])} progress={{ done: baseQuestionPosition(open[0]), total: baseQuestionTotal(open[0]) }} />
            <ProgressBar className="mt-2" value={baseQuestionPosition(open[0]) / baseQuestionTotal(open[0])} />
          </div>
          <Link to={`/play/session/${encodeURIComponent(open[0].id)}`} className="btn-primary">{t('app.continue')}</Link>
        </section>
      )}

      <header className="atlas-section-head">
        <div><span>REGISTER 02</span><h2>{t('play.title')}</h2></div>
        <p>Wähle dein Thema.<br />Die Welt wartet nicht.</p>
      </header>
      <section className="home-category-register">
        {primary.map((c) => (
          <Link key={c.id} to={`/play/${c.id}`} className="home-category-row group">
            <span className="home-category-number">{String(primary.indexOf(c) + 1).padStart(2, '0')}</span>
            <CategoryIconTile id={c.id} />
            <span className="home-category-name">{t(`category.${c.id}`)}</span>
            <span className="home-category-meta">{c.countKey && index?.counts[c.countKey] !== undefined ? `${index.counts[c.countKey].toLocaleString('de-DE')} Einträge` : 'Wissen testen'}</span>
            <Icons.arrow className="home-category-arrow" aria-hidden />
          </Link>
        ))}
        <Link to="/play" className="home-category-row home-category-all">
          <span className="home-category-number">+</span>
          <span className="home-category-all-icon"><Icons.layers /></span>
          <span className="home-category-name">Alle Quizarten</span>
          <span className="home-category-meta">Städte, Bilder, Gemischt & mehr</span>
          <Icons.arrow className="home-category-arrow" aria-hidden />
        </Link>
      </section>

      <section className="home-daily-band">
        <div className="home-daily-copy">
          <span>HEUTE · REGISTER 03</span>
          <h2>{t('daily.title')}</h2>
          <p>Sechs kurze Etappen. Jeden Tag eine neue Route durch die Welt.</p>
          <Link to="/daily" className="home-daily-cta">Tagesroute öffnen <Icons.arrow /></Link>
        </div>
        <div className="home-daily-route">
          <div className="home-daily-line" aria-hidden />
          <ol>
              {PUZZLES.filter((p) => p.available).map((p) => {
                const r = puzzles?.find((x) => x.key === `${p.id}:${today}`)
                const I = PUZZLE_ICONS[p.id]
                return (
                  <li key={p.id}>
                    <span><I aria-hidden /></span>
                    <strong>{t(`daily.${p.id}`)}</strong>
                    {r?.finishedAt && (r.solved ? <Icons.check className="h-3.5 w-3.5 text-ok" /> : <Icons.x className="h-3.5 w-3.5 text-bad" />)}
                  </li>
                )
              })}
          </ol>
        </div>
      </section>
    </Page>
  )
}
