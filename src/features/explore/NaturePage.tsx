import { Link, useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import type { Entity } from '@/domain/types'
import { Page, Card, EmptyState, entityPath, Flag } from '@/ui'
import { WorldMap } from '@/ui/maps'
import { FavoriteButton } from './FavoriteButton'
import { Section } from './CountryPage'
import { CategoryIcon } from '@/ui/icons'

export default function NaturePage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { pathname } = useLocation()
  const geo = useGeoData()
  const list = pathname.startsWith('/water') ? [...geo.rivers, ...geo.lakes] : geo.mountains
  const e = list.find((x) => x.id.endsWith(`:${id}`))
  useDocumentTitle(e?.names.de)
  if (!geo.ready) return null
  if (!e) return <Page back="/explore"><EmptyState title={t('common.error')} /></Page>
  const countries = ((e.attributes.countries as string[]) ?? []).map((c) => geo.byId.get(c)).filter((x): x is Entity => !!x)
  const facts: Array<[string, string]> = []
  if (typeof e.attributes.length_km === 'number') facts.push([t('facts.length'), `${e.attributes.length_km.toLocaleString('de-DE')} km`])
  if (typeof e.attributes.area_km2 === 'number') facts.push([t('facts.area'), `${e.attributes.area_km2.toLocaleString('de-DE')} km²`])
  if (typeof e.attributes.elevation_m === 'number') facts.push([t('facts.elevation'), `${e.attributes.elevation_m.toLocaleString('de-DE')} m`])
  if (e.attributes.kind === 'volcano') facts.push([t('type.mountain'), t('facts.volcano')])
  if (e.attributes.continent) facts.push([t('facts.continent'), t(`scope.${e.attributes.continent}`)])
  const category = e.type === 'mountain' ? 'nature' : 'water'
  return (
    <Page back="/explore" action={<FavoriteButton id={e.id} />}>
      <header className="mb-4">
        <h1 className="flex items-center gap-3 text-3xl font-semibold"><CategoryIcon id={category} className="h-10 w-10 object-contain" /> {e.names.de}</h1>
        <p className="flex flex-wrap items-center gap-2 text-ink-2">
          {countries.map((c) => (
            <Link key={c.id} to={entityPath(c)} className="flex items-center gap-1 underline">
              <Flag entity={c} size="sm" /> {c.names.de}
            </Link>
          ))}
        </p>
      </header>
      <Card className="mb-5">
        <WorldMap highlight={countries.map((c) => c.id)} focus={countries[0]?.id} />
      </Card>
      <Card className="mb-5">
        <dl className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k} className="rounded-xl bg-card-2 px-3 py-2"><dd className="font-medium">{v}</dd><dt className="text-xs text-ink-2">{k}</dt></div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-ink-2">{t('facts.source')}: <a className="underline" href={`https://www.wikidata.org/wiki/${e.attributes.wikidata}`} target="_blank" rel="noreferrer">Wikidata</a> · {t('facts.as_of')} {e.provenance.imported_at}</p>
      </Card>
      <Section title={t('nav.play')}>
        <div className="grid gap-2 md:grid-cols-2">
          <Link to={`/play/${category}/round?scope=${encodeURIComponent(e.attributes.continent ?? 'world')}&len=10`} className="btn-primary"><CategoryIcon id={category} className="h-6 w-6 object-contain" /> {t(`category.${category}`)} · {t(`scope.${e.attributes.continent ?? 'world'}`)}</Link>
          {countries[0] && <Link to={`/play/mixed/round?scope=${countries[0].id}&len=10`} className="btn-secondary">🎯 {t('explore.play_this', { name: countries[0].names.de })}</Link>}
        </div>
      </Section>
    </Page>
  )
}
