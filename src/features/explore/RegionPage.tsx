import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import type { Entity } from '@/domain/types'
import { loadRegions } from '@/services/data/dataService'
import { Page, Card, Flag, EmptyState, entityPath, SourceInfo } from '@/ui'
import { RegionMapView } from '@/ui/maps'
import { FavoriteButton } from './FavoriteButton'
import { Section } from './CountryPage'

export default function RegionPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const geo = useGeoData()
  const iso2 = id?.split('-')[0] ?? ''
  const [regions, setRegions] = useState<Entity[] | null>(null)
  useEffect(() => {
    void loadRegions(`country:${iso2}`).then(setRegions)
  }, [iso2])
  const region = regions?.find((r) => r.id === `region:${id}`)
  useDocumentTitle(region?.names.de)
  if (!regions) return null
  if (!region) return <Page back="/explore"><EmptyState title={t('common.error')} /></Page>
  const country = geo.byId.get(region.attributes.country!)
  const capitalName = region.attributes.capital_name as string | undefined
  const cities = geo.cities.filter((c) => c.attributes.region === region.id)
  const flag = region.media?.find((m) => m.kind === 'flag')
  return (
    <Page back={country ? entityPath(country) : '/explore'} action={<FavoriteButton id={region.id} />}>
      <header className="mb-5 flex flex-col items-center gap-3 text-center md:flex-row md:text-left">
        <Flag entity={region} size="lg" />
        <div>
          <h1 className="text-3xl font-semibold">{region.names.de}</h1>
          {country && (
            <Link to={entityPath(country)} className="text-ink-2 underline">
              {country.names.de}
            </Link>
          )}
          {capitalName && <p className="text-ink-2">{t('facts.capital')}: {capitalName}</p>}
        </div>
      </header>
      <Card className="mb-5">
        <RegionMapView iso2={iso2} highlight={region.id} />
        {flag && <p className="mt-2 text-xs text-ink-2">{t('facts.flag')}: <SourceInfo source={flag.source} url={flag.source_url} /></p>}
      </Card>
      {cities.length > 0 && (
        <Section title={t('explore.cities_of', { name: region.names.de })}>
          <ul className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={c.id}>
                <Link to={entityPath(c)} className="chip">{c.names.de}</Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title={t('nav.play')}>
        <div className="grid gap-2 md:grid-cols-2">
          <Link to={`/play/regions/round?scope=country:${iso2}&len=all`} className="btn-primary">🏳️ {t('category.regions')} · {country?.names.de}</Link>
          <Link to={`/play/maps/round?scope=country:${iso2}&len=all`} className="btn-secondary">🗺️ {t('category.maps')} · {country?.names.de}</Link>
        </div>
      </Section>
    </Page>
  )
}
