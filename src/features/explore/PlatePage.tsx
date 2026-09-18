import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { useGeoData } from '@/app/DataProvider'
import { loadPlates } from '@/services/data/plates'
import { Page, Card, EmptyState, entityPath } from '@/ui'
import { RegionMapView } from '@/ui/maps'
import { FavoriteButton } from './FavoriteButton'

export default function PlatePage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const geo = useGeoData()
  const iso2 = id?.split('-')[0] ?? 'DE'
  const { data: plates } = useAsync(() => loadPlates(iso2), [iso2])
  const plate = plates?.find((p) => p.id === `license_plate:${id}`)
  useDocumentTitle(plate ? `${plate.attributes.code}` : undefined)
  if (!plates) return null
  if (!plate) return <Page back="/play/license_plates"><EmptyState title={t('common.error')} /></Page>
  const region = plate.attributes.region ? geo.byId.get(plate.attributes.region) : undefined
  const country = geo.byId.get(plate.attributes.country!)
  return (
    <Page back="/play/license_plates" action={<FavoriteButton id={plate.id} />}>
      <header className="mb-5 flex items-center gap-4">
        <div className="rounded-lg border-2 border-ink bg-white px-4 py-2 font-mono text-3xl font-bold tracking-widest text-black">{plate.attributes.code as string}</div>
        <div>
          <h1 className="text-2xl font-semibold">{plate.names.de}</h1>
          <p className="text-ink-2">
            {region && <Link to={entityPath(region)} className="underline">{region.names.de}</Link>} {country && <>· <Link to={entityPath(country)} className="underline">{country.names.de}</Link></>}
          </p>
        </div>
      </header>
      <Card className="mb-5">
        <RegionMapView iso2={iso2} highlight={plate.attributes.region as string} />
        <p className="mt-2 text-xs text-ink-2">{t('facts.source')}: {plate.provenance.source}</p>
      </Card>
      <div className="grid gap-2 md:grid-cols-2">
        <Link to={`/play/license_plates/round?scope=country:${iso2}&len=10`} className="btn-primary">🚗 {t('category.license_plates')}</Link>
        <Link to={`/play/license_plates/round?scope=country:${iso2}&len=all`} className="btn-secondary">🚗 {t('play.all', { count: plates.length })}</Link>
      </div>
    </Page>
  )
}
