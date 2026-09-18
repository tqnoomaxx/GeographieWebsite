import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Country } from '@/domain/types'
import { useGeoData } from '@/app/DataProvider'
import { SourceInfo, formatNumber, entityPath } from '@/ui'

export function FactGrid({ country, compact = false }: { country: Country; compact?: boolean }) {
  const { t } = useTranslation()
  const geo = useGeoData()
  const a = country.attributes
  const capital = a.capital ? geo.byId.get(a.capital) : undefined
  const popSrc = country.provenance.fields?.population
  const facts: Array<{ label: string; value: React.ReactNode; src?: React.ReactNode }> = [
    { label: t('facts.capital'), value: capital ? <Link className="underline" to={entityPath(capital)}>{capital.names.de}</Link> : a.capital_names?.join(', ') ?? '–' },
    { label: t('facts.population'), value: formatNumber(a.population), src: popSrc && <SourceInfo source="Wikidata" url={`https://www.wikidata.org/wiki/${popSrc.source_id}`} asOf={popSrc.imported_at} /> },
    { label: t('facts.area'), value: a.area_km2 ? `${a.area_km2.toLocaleString('de-DE')} km²` : '–' },
    { label: t('facts.currency'), value: a.currencies?.map((c) => `${c.name}${c.symbol ? ` (${c.symbol})` : ''}`).join(', ') || '–' },
    { label: (a.languages?.length ?? 0) > 1 ? t('facts.languages') : t('facts.language'), value: a.languages?.join(', ') || '–' },
    { label: t('facts.continent'), value: a.continent ? t(`scope.${a.continent}`) : '–' },
  ]
  if (!compact) {
    facts.push(
      { label: t('facts.subregion'), value: a.subregion ?? '–' },
      { label: t('facts.tld'), value: a.tld?.join(', ') ?? '–' },
      { label: t('facts.calling_code'), value: a.calling_code ?? '–' },
      { label: t('facts.iso'), value: [a.iso2, a.iso3].filter(Boolean).join(' / ') },
      { label: t('facts.highest_point'), value: a.highest_point ? `${a.highest_point.name}${a.highest_point.elevation_m ? ` (${Math.round(a.highest_point.elevation_m)} m)` : ''}` : '–' },
      { label: t('facts.landlocked'), value: a.landlocked === undefined ? '–' : a.landlocked ? t('facts.yes') : t('facts.no') },
    )
  }
  return (
    <dl className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
      {facts.map((f) => (
        <div key={f.label} className="rounded-xl bg-card-2 px-3 py-2">
          <dd className="font-medium leading-tight">
            {f.value} {f.src}
          </dd>
          <dt className="text-xs text-ink-2">{f.label}</dt>
        </div>
      ))}
    </dl>
  )
}
