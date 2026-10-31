import { Link, useParams } from 'react-router-dom'
import { Photo } from '@/ui/Photo'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { usePageViewState } from '@/app/usePageViewState'
import type { Country, Entity } from '@/domain/types'
import { mediaUrl } from '@/services/data/dataService'
import { useRepository } from '@/app/useRepository'
import { Page, Card, Flag, EmptyState, entityPath, SourceInfo } from '@/ui'
import { WorldMap, Outline } from '@/ui/maps'
import { FactGrid } from './facts'
import { CountryQuizPanel } from '@/features/play/CountryQuizPanel'
import { FavoriteButton } from './FavoriteButton'

export default function CountryPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const geo = useGeoData()
  const country = geo.countries.find((c) => c.attributes.iso2 === id) as Country | undefined
  useDocumentTitle(country?.names.de)
  const regions = geo.regions.filter((region) => region.attributes.country === country?.id)
  const [showMap, setShowMap] = usePageViewState('country.map', false)
  const repo = useRepository()
  const { data: progress } = useAsync(
    () => (country ? repo.getEntityProgress(country.id) : Promise.resolve(undefined)),
    [country?.id, repo],
  )
  if (!geo.ready) return null
  if (!country)
    return (
      <Page back="/explore">
        <EmptyState title={t('common.error')} />
      </Page>
    )
  const a = country.attributes
  const cities = geo.cities.filter((c) => c.attributes.country === country.id)
  const landmarks = geo.landmarks.filter((l) => l.attributes.country === country.id)
  const inCountry = (e: Entity) => ((e.attributes.countries as string[]) ?? []).includes(country.id)
  const waters = [...geo.rivers, ...geo.lakes].filter(inCountry)
  const mountains = geo.mountains.filter(inCountry)
  const neighbors = (a.borders ?? []).map((b) => geo.byId.get(b)).filter((x): x is Entity => !!x)
  const flag = country.media?.find((m) => m.kind === 'flag')
  return (
    <Page back="/explore" action={<FavoriteButton id={country.id} />}>
      <header className="mb-5 flex flex-col items-center gap-3 text-center md:flex-row md:text-left">
        <Flag entity={country} size="lg" />
        <div>
          <h1 className="text-3xl font-semibold">{country.names.de}</h1>
          <p className="text-ink-2">
            {a.continent && t(`scope.${a.continent}`)} {a.subregion && `· ${a.subregion}`}{' '}
            {a.independent === false && '· Gebiet'}
          </p>
          {progress && (
            <p className="mt-1 text-xs text-ink-2">
              Lernstand: {t(`learn.states.${progress.state}`)} · {progress.correct} richtig / {progress.wrong}{' '}
              falsch
            </p>
          )}
        </div>
      </header>

      <Card className="mb-5">
        {showMap ? (
          <WorldMap highlight={[country.id]} focus={country.id} />
        ) : country.geometry ? (
          <Outline iso2={a.iso2} className="max-h-64" />
        ) : (
          <div className="skeleton h-40" />
        )}
        <button className="btn-ghost mt-2 w-full text-sm" onClick={() => setShowMap((s) => !s)}>
          {showMap ? t('common.less') : `🗺️ ${t('explore.show_on_map')}`}
        </button>
      </Card>
      <Card className="mb-5">
        <FactGrid country={country} />
        <details className="country-data-note mt-4">
          <summary>Quellen &amp; Prüfstand</summary>
          <p>
            Basisdaten:{' '}
            {country.provenance.source_url ? (
              <a className="underline" href={country.provenance.source_url} target="_blank" rel="noreferrer">
                {country.provenance.source}
              </a>
            ) : (
              country.provenance.source
            )}
            {country.provenance.license && ` (${country.provenance.license})`}.
          </p>
          <p>
            Importiert am {country.provenance.imported_at.slice(0, 10)}. Ein Importdatum ist kein fachliches
            Prüfdatum. Belegte Hauptstädte und Symbole haben eigene Quellen und Prüfstände.
          </p>
          <p>„Keine gesicherte Angabe“ kennzeichnet eine Lücke in unseren geprüften Daten.</p>
          {flag && (
            <p>
              Flagge: <SourceInfo source={flag.source} url={flag.source_url} />
            </p>
          )}
        </details>
      </Card>

      {neighbors.length > 0 && (
        <Section title={t('explore.neighbors')}>
          <ul className="flex flex-wrap gap-2">
            {neighbors.map((n) => (
              <li key={n.id}>
                <Link to={entityPath(n)} className="chip gap-2">
                  <Flag entity={n} size="sm" /> {n.names.de}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {regions.length > 0 && (
        <Section
          title={t('explore.regions_of', { name: country.names.de })}
          action={
            <Link
              to={`/play/regions?quiz=regional-flags&scope=${encodeURIComponent(country.id)}`}
              className="btn-secondary py-2 text-sm"
            >
              🎯 {t('play.all', { count: regions.length })}
            </Link>
          }
        >
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {regions.map((r) => {
              const cap = r.attributes.capital_name as string | undefined
              return (
                <li key={r.id}>
                  <Link to={entityPath(r)} className="card flex items-center gap-2 p-2 hover:bg-card-2">
                    <Flag entity={r} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{r.names.de}</span>
                      {cap && <span className="block truncate text-xs text-ink-2">{cap}</span>}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
      {cities.length > 0 && (
        <Section title={t('explore.cities_of', { name: country.names.de })}>
          <ul className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={c.id}>
                <Link to={entityPath(c)} className="chip">
                  {c.attributes.is_capital ? '★ ' : ''}
                  {c.names.de}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {waters.length > 0 && (
        <Section
          title={t('explore.water_of', { name: country.names.de })}
          action={
            <a href="#country-exercises" className="btn-secondary py-2 text-sm">
              Passende Übungen
            </a>
          }
        >
          <ul className="flex flex-wrap gap-2">
            {waters.map((w) => (
              <li key={w.id}>
                <Link to={entityPath(w)} className="chip">
                  {w.type === 'river' ? '🌊' : '💧'} {w.names.de}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {mountains.length > 0 && (
        <Section
          title={t('explore.nature_of', { name: country.names.de })}
          action={
            <a href="#country-exercises" className="btn-secondary py-2 text-sm">
              Passende Übungen
            </a>
          }
        >
          <ul className="flex flex-wrap gap-2">
            {mountains.map((m) => (
              <li key={m.id}>
                <Link to={entityPath(m)} className="chip">
                  {m.attributes.kind === 'volcano' ? '🌋' : '🏔️'} {m.names.de}
                  {typeof m.attributes.elevation_m === 'number' && (
                    <span className="ml-1 text-xs text-ink-2">
                      {m.attributes.elevation_m.toLocaleString('de-DE')} m
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {landmarks.length > 0 && (
        <Section title={t('explore.landmarks_of', { name: country.names.de })}>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {landmarks.map((l) => {
              const photo = l.media?.find((m) => m.kind === 'photo')
              return (
                <li key={l.id}>
                  <Link to={entityPath(l)} className="card block overflow-hidden hover:bg-card-2">
                    {photo && (
                      <Photo
                        src={mediaUrl(photo.url)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/3] w-full bg-card-2 object-contain"
                      />
                    )}
                    <p className="p-2 text-sm font-medium leading-tight">{l.names.de}</p>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
      <div id="country-exercises">
        <CountryQuizPanel key={country.id} country={country} />
      </div>
    </Page>
  )
}

export function Section({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wider text-ink-2">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
