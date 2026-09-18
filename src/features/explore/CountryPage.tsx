import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import type { Country, Entity } from '@/domain/types'
import { loadRegions, mediaUrl } from '@/services/data/dataService'
import { getRepository } from '@/services/progress'
import { Page, Card, Flag, EmptyState, entityPath, SourceInfo } from '@/ui'
import { WorldMap, Outline } from '@/ui/maps'
import { FactGrid } from './facts'
import { FavoriteButton } from './FavoriteButton'

export default function CountryPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const geo = useGeoData()
  const country = geo.countries.find((c) => c.attributes.iso2 === id) as Country | undefined
  useDocumentTitle(country?.names.de)
  const [regions, setRegions] = useState<Entity[]>([])
  const [showMap, setShowMap] = useState(false)
  useEffect(() => {
    if (country) void loadRegions(country.id).then(setRegions)
  }, [country])
  const { data: progress } = useAsync(() => (country ? getRepository().getEntityProgress(country.id) : Promise.resolve(undefined)), [country?.id])
  if (!geo.ready) return null
  if (!country) return <Page back="/explore"><EmptyState title={t('common.error')} /></Page>
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
            {a.continent && t(`scope.${a.continent}`)} {a.subregion && `· ${a.subregion}`} {a.independent === false && '· Gebiet'}
          </p>
          {progress && <p className="mt-1 text-xs text-ink-2">Lernstand: {progress.state} · {progress.correct} richtig / {progress.wrong} falsch</p>}
        </div>
      </header>

      <div className="mb-5 grid gap-4 md:grid-cols-[2fr_1fr]">
        <Card>
          {showMap ? <WorldMap highlight={[country.id]} focus={country.id} /> : country.geometry ? <Outline iso2={a.iso2} className="max-h-64" /> : <div className="skeleton h-40" />}
          <button className="btn-ghost mt-2 w-full text-sm" onClick={() => setShowMap((s) => !s)}>
            {showMap ? t('common.less') : `🗺️ ${t('explore.show_on_map')}`}
          </button>
        </Card>
        <Card>
          <FactGrid country={country} compact />
        </Card>
      </div>
      <Card className="mb-5">
        <FactGrid country={country} />
        <p className="mt-3 text-xs text-ink-2">
          {t('facts.source')}: {country.provenance.source} {country.provenance.license && `(${country.provenance.license})`} · {t('facts.as_of')} {country.provenance.imported_at}
          {flag && <> · {t('facts.flag')}: <SourceInfo source={flag.source} url={flag.source_url} /></>}
        </p>
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
        <Section title={t('explore.regions_of', { name: country.names.de })} action={<Link to={`/play/regions/round?scope=${country.id}&len=all`} className="btn-secondary py-2 text-sm">🎯 {t('play.all', { count: regions.length })}</Link>}>
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
                  {c.attributes.is_capital ? '★ ' : ''}{c.names.de}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {waters.length > 0 && (
        <Section title={t('explore.water_of', { name: country.names.de })} action={<Link to={`/play/water/round?scope=${country.id}&len=10`} className="btn-secondary py-2 text-sm">🎯 {t('category.water')}</Link>}>
          <ul className="flex flex-wrap gap-2">
            {waters.map((w) => (
              <li key={w.id}><Link to={entityPath(w)} className="chip">{w.type === 'river' ? '🌊' : '💧'} {w.names.de}</Link></li>
            ))}
          </ul>
        </Section>
      )}
      {mountains.length > 0 && (
        <Section title={t('explore.nature_of', { name: country.names.de })} action={<Link to={`/play/nature/round?scope=${country.id}&len=10`} className="btn-secondary py-2 text-sm">🎯 {t('category.nature')}</Link>}>
          <ul className="flex flex-wrap gap-2">
            {mountains.map((m) => (
              <li key={m.id}><Link to={entityPath(m)} className="chip">{m.attributes.kind === 'volcano' ? '🌋' : '🏔️'} {m.names.de}{typeof m.attributes.elevation_m === 'number' && <span className="ml-1 text-xs text-ink-2">{m.attributes.elevation_m.toLocaleString('de-DE')} m</span>}</Link></li>
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
                    {photo && <img src={mediaUrl(photo.url)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />}
                    <p className="p-2 text-sm font-medium leading-tight">{l.names.de}</p>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
      <div className="mt-6 grid gap-2 md:grid-cols-2">
        <Link to={`/play/mixed/round?scope=${country.id}&len=10`} className="btn-primary">
          🎯 {t('explore.play_this', { name: country.names.de })}
        </Link>
        <Link to={`/play/countries/round?scope=${encodeURIComponent(a.continent ?? 'world')}&len=10`} className="btn-secondary">
          🌍 {t(`scope.${a.continent ?? 'world'}`)}
        </Link>
      </div>
    </Page>
  )
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
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
