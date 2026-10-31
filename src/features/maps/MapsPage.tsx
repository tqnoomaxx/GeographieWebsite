import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Car, Globe, Map as MapIcon, Phone, Search, Wallet } from 'lucide-react'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { usePageViewState } from '@/app/usePageViewState'
import { fetchJson } from '@/services/data/dataService'
import { ErrorState, Flag, LoadingState, Page } from '@/ui'
import {
  MAP_THEMES,
  matchesMapSearch,
  themeGroups,
  themeValue,
  UNKNOWN_COLOR,
  type CountryMapFacts,
  type MapTheme,
} from './mapThemes'
import { ThematicWorldMap } from './ThematicWorldMap'
import './maps-page.css'

const loadFacts = () => fetchJson<CountryMapFacts>('meta/country-map-facts.json')
const THEME_ICONS = { calling: Phone, driving: Car, domains: Globe, currencies: Wallet }
export default function MapsPage() {
  const geo = useGeoData()
  const facts = useAsync(loadFacts, [])
  const [params, setParams] = useSearchParams()
  const theme: MapTheme = MAP_THEMES.find((item) => item.id === params.get('theme'))?.id ?? 'calling'
  const definition = MAP_THEMES.find((item) => item.id === theme)!
  const [query, setQuery] = usePageViewState('maps.query', '')
  const [filter, setFilter] = usePageViewState('maps.filter', '')
  const [selected, setSelected] = usePageViewState<string | undefined>('maps.selected', undefined)
  const [labels, setLabels] = usePageViewState('maps.labels', true)
  const onSelect = useCallback((id: string) => setSelected(id), [setSelected])
  useDocumentTitle('Karten')
  const countries = useMemo(
    () =>
      geo.countries
        .filter((country) => country.attributes.iso2 !== 'EU')
        .sort((a, b) => a.names.de.localeCompare(b.names.de, 'de')),
    [geo.countries],
  )
  const visible = useMemo(() => {
    if (!facts.data) return []
    return countries.filter((country) => {
      const value = themeValue(country, facts.data!, theme)
      return (!filter || value.group === filter) && matchesMapSearch(country, facts.data!, theme, query)
    })
  }, [countries, facts.data, theme, filter, query])
  const visibleSet = useMemo(() => new Set(visible.map((country) => country.id)), [visible])
  const groups = useMemo(() => {
    if (!facts.data) return []
    const counts = new Map<string, number>()
    for (const country of countries) {
      const key = themeValue(country, facts.data, theme).group
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...themeGroups(theme), { id: 'unknown', title: 'Keine Angabe', color: UNKNOWN_COLOR }]
      .map((group) => ({ ...group, count: counts.get(group.id) ?? 0 }))
      .filter((group) => group.count)
  }, [countries, facts.data, theme])
  const chosen = countries.find((country) => country.id === selected)
  const changeTheme = (next: MapTheme) => {
    setFilter('')
    setQuery('')
    setParams({ theme: next })
  }
  return (
    <Page wide>
      <div className="maps-page">
        <header className="simple-page-heading">
          <h1>Karten</h1>
          <p>Die Welt nach Themen entdecken. Wähle eine Karte und tippe auf ein Land.</p>
        </header>
        <nav className="atlas-theme-tabs" aria-label="Kartenthema">
          {MAP_THEMES.map((item) => {
            const Icon = THEME_ICONS[item.id]
            return (
              <button
                type="button"
                key={item.id}
                aria-pressed={theme === item.id}
                onClick={() => changeTheme(item.id)}
              >
                <Icon aria-hidden />
                <span>{item.title}</span>
              </button>
            )
          })}
        </nav>
        {facts.error ? (
          <ErrorState message="Die Kartenthemen konnten nicht geladen werden." onRetry={facts.reload} />
        ) : !facts.data ? (
          <LoadingState message="Kartenthemen werden geladen …" />
        ) : (
          <>
            <div className="atlas-map-heading">
              <div>
                <h2>{definition.title}</h2>
                <p>{definition.description}</p>
              </div>
              <label className="atlas-label-toggle">
                <input
                  type="checkbox"
                  checked={labels}
                  onChange={(event) => setLabels(event.target.checked)}
                />
                Beschriftungen
              </label>
            </div>
            <div className="atlas-workspace">
              <section className="atlas-map-section" aria-label="Themenkarte">
                <div className="atlas-map-frame">
                  <ThematicWorldMap
                    countries={countries}
                    facts={facts.data}
                    theme={theme}
                    visible={visibleSet}
                    selected={selected}
                    labels={labels}
                    onSelect={onSelect}
                  />
                </div>
                <div className="atlas-legend" aria-label="Kartenlegende">
                  <button type="button" aria-pressed={!filter} onClick={() => setFilter('')}>
                    Alle Länder
                  </button>
                  {groups.map((group) => (
                    <button
                      type="button"
                      key={group.id}
                      aria-pressed={filter === group.id}
                      onClick={() => setFilter(filter === group.id ? '' : group.id)}
                    >
                      <i style={{ background: group.color }} aria-hidden />
                      {group.title}
                      <small>{group.count}</small>
                    </button>
                  ))}
                </div>
                <p className="atlas-map-note">
                  Kleine Staaten und Inselgebiete sind zusätzlich als Punkte oder in der Länderliste
                  erreichbar. Beim Hineinzoomen erscheinen weitere Beschriftungen.
                </p>
              </section>
              <aside className="atlas-country-panel" aria-label="Länderdetails">
                {chosen ? (
                  <div className="atlas-country-details" aria-live="polite">
                    <div className="atlas-country-heading">
                      <Flag entity={chosen} size="md" />
                      <h3>{chosen.names.de}</h3>
                    </div>
                    <dl>
                      {MAP_THEMES.map((item) => (
                        <div key={item.id} className={theme === item.id ? 'is-current' : ''}>
                          <dt>{item.title}</dt>
                          <dd>{themeValue(chosen, facts.data!, item.id).label || 'Keine Angabe'}</dd>
                        </div>
                      ))}
                    </dl>
                    {facts.data.countries[chosen.id]?.note && (
                      <p className="atlas-map-note">{facts.data.countries[chosen.id].note}</p>
                    )}
                    <Link className="atlas-country-more" to={`/country/${chosen.attributes.iso2}`}>
                      Land entdecken
                      <ArrowRight aria-hidden />
                    </Link>
                  </div>
                ) : (
                  <div className="atlas-country-placeholder">
                    <MapIcon aria-hidden />
                    <h3>Welches Land interessiert dich?</h3>
                    <p>
                      Wähle ein Land auf der Karte oder in der Liste. Hier findest du alle vier Themen auf
                      einen Blick.
                    </p>
                  </div>
                )}
                <label className="atlas-country-search">
                  <Search aria-hidden />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      theme === 'calling' ? 'Land oder Vorwahl suchen …' : 'Land oder Kartenwert suchen …'
                    }
                    aria-label="Land oder Kartenwert suchen"
                  />
                </label>
                <p className="atlas-results-count" role="status">
                  {visible.length} {visible.length === 1 ? 'Land / Gebiet' : 'Länder & Gebiete'}
                </p>
                <div className="atlas-country-results" aria-label="Länderliste">
                  {visible.map((country) => (
                    <button
                      type="button"
                      key={country.id}
                      aria-pressed={selected === country.id}
                      onClick={() => onSelect(country.id)}
                    >
                      <Flag entity={country} size="sm" />
                      <span>
                        <strong>{country.names.de}</strong>
                        <small>{themeValue(country, facts.data!, theme).label || 'Keine Angabe'}</small>
                      </span>
                      <ArrowRight aria-hidden />
                    </button>
                  ))}
                  {!visible.length && (
                    <p>Keine Treffer. Ändere die Suche oder wähle in der Legende „Alle Länder“.</p>
                  )}
                </div>
              </aside>
            </div>
            <details className="atlas-sources">
              <summary>Quellen und Hinweise</summary>
              <p>
                Verkehrsseite und Telefonvorwahlen:{' '}
                <a href={facts.data.source.url} target="_blank" rel="noreferrer">
                  REST Countries
                </a>{' '}
                · geprüft am {new Date(facts.data.checkedAt + 'T12:00:00Z').toLocaleDateString('de-DE')}.{' '}
                <a
                  href={`${import.meta.env.BASE_URL}data/RESTCOUNTRIES-LICENSE.txt`}
                  target="_blank"
                  rel="noreferrer"
                >
                  MPL-2.0
                </a>
                .
              </p>
              <p>
                Internet-Endungen und Währungen: bestehender Länderbestand aus{' '}
                <a href="https://github.com/mledoze/countries" target="_blank" rel="noreferrer">
                  mledoze/countries
                </a>{' '}
                und den dort verknüpften Quellen. Grenzen: Natural Earth (Public Domain).
              </p>
              <p>
                Geteilte Telefonvorwahlen enthalten bei kleineren Gebieten gegebenenfalls eine
                Gebietskennzahl. Für den{' '}
                <a
                  href="https://www.vatican.va/content/vatican/en/info.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  Vatikan
                </a>{' '}
                ist die verwendete Vorwahl +39 erfasst. Fehlende oder nicht anwendbare Werte bleiben als
                „Keine Angabe“ sichtbar.
              </p>
            </details>
          </>
        )}
      </div>
    </Page>
  )
}
