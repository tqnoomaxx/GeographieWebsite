import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import { mediaUrl } from '@/services/data/dataService'
import { Page, Card, EmptyState, entityPath, Flag } from '@/ui'
import { FavoriteButton } from './FavoriteButton'
import { Section } from './CountryPage'

export default function CityPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const geo = useGeoData()
  const city = geo.cities.find((c) => c.id === `city:${id}`)
  useDocumentTitle(city?.names.de)
  if (!geo.ready) return null
  if (!city) return <Page back="/explore"><EmptyState title={t('common.error')} /></Page>
  const country = geo.byId.get(city.attributes.country!)
  const photo = city.media?.find((m) => m.kind === 'photo')
  const landmarks = geo.landmarks.filter((l) => l.attributes.place_name === city.names.de)
  return (
    <Page back={country ? entityPath(country) : '/explore'} action={<FavoriteButton id={city.id} />}>
      <header className="mb-5">
        <h1 className="text-3xl font-semibold">🏙️ {city.names.de}</h1>
        <p className="flex items-center gap-2 text-ink-2">
          {city.attributes.region && <Link to={`/region/${(city.attributes.region as string).slice(7)}`} className="underline">{geo.byId.get(city.attributes.region as string)?.names.de ?? (city.attributes.region as string).slice(7)}</Link>}
          {country && (
            <Link to={entityPath(country)} className="flex items-center gap-1 underline">
              <Flag entity={country} size="sm" /> {country.names.de}
            </Link>
          )}
          {!!city.attributes.is_capital && <span>· ★ {t('facts.capital')}</span>}
        </p>
      </header>
      {photo && (
        <Card className="mb-5 overflow-hidden p-0">
          <img src={mediaUrl(photo.url)} alt={photo.caption ?? city.names.de} className="aspect-video w-full object-cover" />
          <p className="p-3 text-xs text-ink-2">
            {photo.caption && <strong>{photo.caption} · </strong>}
            {t('facts.image_source')}: <a className="underline" href={photo.source_url} target="_blank" rel="noreferrer">{photo.author} · {photo.license}</a>
          </p>
        </Card>
      )}
      {landmarks.length > 0 && (
        <Section title={t('category.landmarks')}>
          <ul className="flex flex-wrap gap-2">
            {landmarks.map((l) => (
              <li key={l.id}>
                <Link to={entityPath(l)} className="chip">{l.names.de}</Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {country && <Link to={`/play/cities/round?scope=${country.id}&len=all`} className="btn-primary">🎯 {t('explore.play_this', { name: country.names.de })}</Link>}
        <Link to={`/play/capitals/round?scope=${encodeURIComponent(country?.attributes.continent ?? 'world')}&len=10`} className="btn-secondary">🏛️ {t('category.capitals')}</Link>
      </div>
    </Page>
  )
}
