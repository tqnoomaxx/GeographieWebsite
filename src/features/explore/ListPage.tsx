import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import { Page, Flag, formatNumber, entityPath } from '@/ui'
import { mediaUrl } from '@/services/data/dataService'
import type { Country } from '@/domain/types'
import { Photo } from '@/ui/Photo'
import { normalizeAnswer } from '@/engine/normalize'
import { populationReference } from '@/domain/population'

export default function ListPage() {
  const { t } = useTranslation()
  const { list } = useParams()
  const geo = useGeoData()
  const [landmarkQuery, setLandmarkQuery] = useState('')
  const [landmarkContinent, setLandmarkContinent] = useState('world')
  const landmarks = useMemo(() => {
    const query = normalizeAnswer(landmarkQuery)
    return geo.landmarks
      .filter((landmark) => {
        if (landmarkContinent !== 'world' && landmark.attributes.continent !== landmarkContinent) return false
        const country = landmark.attributes.country ? geo.byId.get(landmark.attributes.country) : undefined
        return (
          !query ||
          normalizeAnswer(
            [
              landmark.names.de,
              landmark.names.en,
              ...(landmark.aliases ?? []),
              landmark.attributes.place_name,
              country?.names.de,
              country?.names.en,
            ]
              .filter(Boolean)
              .join(' '),
          ).includes(query)
        )
      })
      .sort((a, b) => a.names.de.localeCompare(b.names.de, 'de'))
  }, [geo.landmarks, geo.byId, landmarkQuery, landmarkContinent])
  const title =
    {
      largest: t('explore.largest_countries'),
      populous: t('explore.most_populous'),
      landmarks: t('explore.landmarks'),
      rivers: t('explore.longest_rivers'),
      lakes: t('explore.largest_lakes'),
      mountains: t('explore.highest_mountains'),
    }[list ?? ''] ?? ''
  useDocumentTitle(title)
  if (list === 'landmarks') {
    return (
      <Page title={title} back="/explore">
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <label>
            <span className="sr-only">{t('explore.landmark_search')}</span>
            <input
              type="search"
              className="min-h-12 w-full rounded-xl border border-line bg-card px-4"
              value={landmarkQuery}
              onChange={(event) => setLandmarkQuery(event.target.value)}
              placeholder={t('explore.landmark_search')}
            />
          </label>
          <label>
            <span className="sr-only">{t('explore.landmark_region')}</span>
            <select
              className="min-h-12 w-full rounded-xl border border-line bg-card px-3"
              value={landmarkContinent}
              onChange={(event) => setLandmarkContinent(event.target.value)}
            >
              {['world', 'europe', 'africa', 'asia', 'north-america', 'south-america', 'oceania'].map(
                (continent) => (
                  <option key={continent} value={continent}>
                    {t(`scope.${continent}`)}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
        <p className="mb-3 text-sm text-ink-2" aria-live="polite">
          {t('explore.landmark_count', { shown: landmarks.length, total: geo.landmarks.length })}
        </p>
        {geo.ready && !landmarks.length && (
          <p className="card p-5 text-ink-2">{t('explore.landmark_no_results')}</p>
        )}
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3" data-landmark-grid>
          {landmarks.map((l) => {
            const photo = l.media?.find((m) => m.kind === 'photo')
            const country = l.attributes.country ? geo.byId.get(l.attributes.country) : undefined
            return (
              <li key={l.id}>
                <Link to={entityPath(l)} className="card block h-full overflow-hidden hover:bg-card-2">
                  {photo && (
                    <Photo
                      src={mediaUrl(photo.url)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] w-full bg-card-2 object-contain"
                    />
                  )}
                  <div className="p-3">
                    <p className="font-medium leading-tight">{l.names.de}</p>
                    <p className="text-xs text-ink-2">{country?.names.de}</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </Page>
    )
  }
  const nature = {
    rivers: [geo.rivers, 'length_km', ' km'],
    lakes: [geo.lakes, 'area_km2', ' km²'],
    mountains: [geo.mountains, 'elevation_m', ' m'],
  }[list ?? ''] as [typeof geo.rivers, string, string] | undefined
  if (nature) {
    const [items, k, unit] = nature
    const rows = items
      .filter((e) => typeof e.attributes[k] === 'number')
      .sort((a, b) => (b.attributes[k] as number) - (a.attributes[k] as number))
      .slice(0, 60)
    return (
      <Page title={title} back="/explore">
        <ol className="card divide-y divide-line">
          {rows.map((e, i) => (
            <li key={e.id}>
              <Link to={entityPath(e)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-card-2">
                <span className="w-6 text-right text-sm tabular-nums text-ink-2">{i + 1}</span>
                <span className="flex-1 font-medium">{e.names.de}</span>
                <span className="hidden text-xs text-ink-2 md:inline">
                  {((e.attributes.countries as string[]) ?? [])
                    .map((c) => geo.byId.get(c)?.names.de)
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(', ')}
                </span>
                <span className="tabular-nums text-ink-2">
                  {(e.attributes[k] as number).toLocaleString('de-DE')}
                  {unit}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </Page>
    )
  }
  const key = list === 'largest' ? 'area_km2' : 'population'
  const rows = geo.countries
    .filter((c) => (c as Country).attributes.independent !== false && c.attributes[key])
    .sort((a, b) => (b.attributes[key] as number) - (a.attributes[key] as number))
    .slice(0, 50)
  const popReference = key === 'population' && rows[0] ? populationReference(rows[0]) : undefined
  return (
    <Page title={title} back="/explore">
      {popReference && (
        <p className="mb-4 text-sm text-ink-2">
          {popReference.detail}{' '}
          <a className="underline" href={popReference.url} target="_blank" rel="noreferrer">
            {popReference.source}
          </a>
        </p>
      )}
      <ol className="card divide-y divide-line">
        {rows.map((c, i) => (
          <li key={c.id}>
            <Link to={entityPath(c)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-card-2">
              <span className="w-6 text-right text-sm tabular-nums text-ink-2">{i + 1}</span>
              <Flag entity={c} size="sm" />
              <span className="flex-1 font-medium">{c.names.de}</span>
              <span className="tabular-nums text-ink-2">
                {key === 'area_km2'
                  ? `${(c.attributes[key] as number).toLocaleString('de-DE')} km²`
                  : formatNumber(c.attributes[key] as number)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Page>
  )
}
