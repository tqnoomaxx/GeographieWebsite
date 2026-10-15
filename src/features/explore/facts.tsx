import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Country, NationalSymbol, NationalSymbolKind } from '@/domain/types'
import { CAPITAL_ROLE_LABELS, countryCapitals } from '@/domain/capitals'
import { nationalSymbols } from '@/domain/nationalSymbols'
import { useGeoData } from '@/app/DataProvider'
import { SourceInfo, formatNumber, entityPath } from '@/ui'

export function FactGrid({ country, compact = false }: { country: Country; compact?: boolean }) {
  const { t } = useTranslation()
  const geo = useGeoData()
  const a = country.attributes
  const capitals = countryCapitals(country, geo.byId)
  const popSrc = country.provenance.fields?.population
  const languageSource = country.provenance.fields?.languages
  const facts: Array<{ label: string; value: React.ReactNode; src?: React.ReactNode }> = [
    {
      label: a.iso2 === 'CH' ? 'Bundesstadt' : t(capitals.length > 1 ? 'facts.capitals' : 'facts.capital'),
      value: capitals.length ? (
        <ul className="space-y-1">
          {capitals.map((capital) => {
            const detail = a.capital_details?.find((place) => place.city === capital.id)
            return (
              <li key={capital.id}>
                <Link className="underline" to={entityPath(capital)}>
                  {capital.names.de}
                </Link>
                {detail && (capitals.length > 1 || detail.role === 'claimed') && (
                  <small className="block text-ink-2">{CAPITAL_ROLE_LABELS[detail.role]}</small>
                )}
                {!compact && detail && (
                  <SourceInfo source={detail.source} url={detail.source_url} asOf={detail.checked_at} dateLabel="Geprüft" />
                )}
              </li>
            )
          })}
        </ul>
      ) : a.iso2 === 'NR' ? (
        t('facts.no_official_capital')
      ) : (
        'Keine gesicherte Angabe'
      ),
    },
    {
      label: t('facts.population'),
      value: formatNumber(a.population),
      src: popSrc && (
        <SourceInfo
          source="Wikidata"
          url={`https://www.wikidata.org/wiki/${popSrc.source_id}`}
          asOf={popSrc.imported_at}
          dateLabel="Importiert"
        />
      ),
    },
    { label: t('facts.area'), value: a.area_km2 ? `${a.area_km2.toLocaleString('de-DE')} km²` : 'Keine gesicherte Angabe' },
    {
      label: t('facts.currency'),
      value: a.currencies?.map((c) => `${c.name}${c.symbol ? ` (${c.symbol})` : ''}`).join(', ') || 'Keine gesicherte Angabe',
    },
    {
      label: (a.languages?.length ?? 0) > 1 ? t('facts.languages') : t('facts.language'),
      value: a.languages?.join(', ') || 'Keine gesicherte Angabe',
      src: languageSource && (
        <SourceInfo
          source={languageSource.source}
          url={languageSource.source_url}
          asOf={languageSource.imported_at}
          dateLabel="Importiert"
        />
      ),
    },
    { label: t('facts.continent'), value: a.continent ? t(`scope.${a.continent}`) : 'Keine gesicherte Angabe' },
  ]
  for (const kind of ['animal', 'bird', 'flower', 'tree', 'fish'] as NationalSymbolKind[]) {
    const symbols = nationalSymbols(country, kind)
    if (symbols.length || !compact)
      facts.push({
        label: t(`facts.national_${kind}`),
        value: symbols.length ? (
          <SymbolList symbols={symbols} checkedAt={a.national_symbols_checked_at} />
        ) : (
          <span className="text-sm text-ink-2">{t('facts.symbol_not_documented')}</span>
        ),
      })
  }
  if (!compact) {
    for (const place of a.capital_details?.filter((detail) => !detail.quiz) ?? []) {
      const city = geo.byId.get(place.city)
      if (city)
        facts.push({
          label: CAPITAL_ROLE_LABELS[place.role],
          value: (
            <Link className="underline" to={entityPath(city)}>
              {city.names.de}
            </Link>
          ),
          src: <SourceInfo source={place.source} url={place.source_url} asOf={place.checked_at} dateLabel="Geprüft" />,
        })
    }
    facts.push(
      { label: t('facts.official_name'), value: a.official_name ?? country.names.de },
      {
        label: t('facts.national_anthem'),
        value: a.national_anthems?.length ? (
          <ul className="space-y-1">
            {a.national_anthems.map((anthem) => (
              <li key={anthem.name}>
                {anthem.name} <SourceInfo source={anthem.source} url={anthem.source_url} />
              </li>
            ))}
          </ul>
        ) : (
          'Keine gesicherte Angabe'
        ),
      },
      { label: t('facts.subregion'), value: a.subregion ?? 'Keine gesicherte Angabe' },
      { label: t('facts.tld'), value: a.tld?.join(', ') ?? 'Keine gesicherte Angabe' },
      { label: t('facts.calling_code'), value: a.calling_code ?? 'Keine gesicherte Angabe' },
      { label: t('facts.iso'), value: [a.iso2, a.iso3].filter(Boolean).join(' / ') },
      {
        label: t('facts.highest_point'),
        value: a.highest_point
          ? `${a.highest_point.name}${a.highest_point.elevation_m ? ` (${Math.round(a.highest_point.elevation_m)} m)` : ''}`
          : 'Keine gesicherte Angabe',
      },
      {
        label: t('facts.landlocked'),
        value: a.landlocked === undefined ? 'Keine gesicherte Angabe' : a.landlocked ? t('facts.yes') : t('facts.no'),
      },
    )
  }
  return (
    <>
      <dl className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
        {facts.map((f) => (
          <div key={f.label} className="min-w-0 hyphens-auto break-words rounded-xl bg-card-2 px-3 py-2">
            <dd className="font-medium leading-tight">
              {f.value} {f.src}
            </dd>
            <dt className="text-xs text-ink-2">{f.label}</dt>
          </div>
        ))}
      </dl>
      {!compact && a.capital_note && (
        <p className="mt-3 text-sm text-ink-2" data-capital-note>
          {a.capital_note}
        </p>
      )}
      {!compact && <p className="mt-3 text-xs text-ink-2">{t('facts.symbol_explanation')}</p>}
    </>
  )
}

function SymbolList({ symbols, checkedAt }: { symbols: NationalSymbol[]; checkedAt?: string }) {
  const { t } = useTranslation()
  return (
    <ul className="space-y-2">
      {symbols.map((symbol) => (
        <li key={symbol.name}>
          {symbol.name} <SourceInfo source={symbol.source} url={symbol.source_url} asOf={checkedAt} dateLabel="Geprüft" />
          <small className="block text-ink-2">{t(`facts.symbol_status_${symbol.status}`)}</small>
          {symbol.note && <small className="block text-ink-2">{symbol.note}</small>}
        </li>
      ))}
    </ul>
  )
}
