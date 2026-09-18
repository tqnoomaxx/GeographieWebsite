import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import { mediaUrl } from '@/services/data/dataService'
import { Page, Card, EmptyState, entityPath, Flag } from '@/ui'
import { FavoriteButton } from './FavoriteButton'

export default function LandmarkPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const geo = useGeoData()
  const lm = geo.landmarks.find((l) => l.id === `landmark:${id}`)
  useDocumentTitle(lm?.names.de)
  if (!geo.ready) return null
  if (!lm) return <Page back="/explore/landmarks"><EmptyState title={t('common.error')} /></Page>
  const country = geo.byId.get(lm.attributes.country!)
  const photo = lm.media?.find((m) => m.kind === 'photo')
  return (
    <Page back="/explore/landmarks" action={<FavoriteButton id={lm.id} />}>
      <header className="mb-4">
        <h1 className="text-3xl font-semibold">🏛️ {lm.names.de}</h1>
        <p className="flex flex-wrap items-center gap-2 text-ink-2">
          {lm.attributes.place_name as string}
          {country && (
            <Link to={entityPath(country)} className="flex items-center gap-1 underline">
              <Flag entity={country} size="sm" /> {country.names.de}
            </Link>
          )}
        </p>
      </header>
      {photo && (
        <Card className="mb-5 overflow-hidden p-0">
          <img src={mediaUrl(photo.url)} alt={lm.names.de} className="max-h-[60vh] w-full object-cover" />
          <p className="p-3 text-xs text-ink-2">
            {t('facts.image_source')}: <a className="underline" href={photo.source_url} target="_blank" rel="noreferrer">{photo.author} · {photo.license}</a>
          </p>
        </Card>
      )}
      <Card className="mb-5">
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-card-2 px-3 py-2"><dd className="font-medium">{lm.attributes.unesco as string}</dd><dt className="text-xs text-ink-2">{t('facts.unesco')}</dt></div>
          <div className="rounded-xl bg-card-2 px-3 py-2"><dd className="font-medium">{lm.names.en}</dd><dt className="text-xs text-ink-2">English</dt></div>
        </dl>
        {lm.provenance.source_url && <p className="mt-2 text-xs text-ink-2">{t('facts.source')}: <a className="underline" href={lm.provenance.source_url} target="_blank" rel="noreferrer">Wikipedia</a></p>}
      </Card>
      <div className="grid gap-2 md:grid-cols-2">
        <Link to={`/play/images/round?scope=${encodeURIComponent(lm.attributes.continent ?? 'world')}&len=10`} className="btn-primary">📸 {t('category.images')}</Link>
        {country && <Link to={`/play/mixed/round?scope=${country.id}&len=10`} className="btn-secondary">🎯 {t('explore.play_this', { name: country.names.de })}</Link>}
      </div>
    </Page>
  )
}
