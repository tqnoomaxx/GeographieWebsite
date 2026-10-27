import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ChevronDown, Search } from 'lucide-react'
import { useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import { normalizeAnswer } from '@/engine/normalize'
import { Page, Flag } from '@/ui'

const CONTINENTS = ['europe', 'asia', 'africa', 'north-america', 'south-america', 'oceania'] as const
const LISTS = {
  largest: 'largest_countries',
  populous: 'most_populous',
  landmarks: 'landmarks',
  rivers: 'longest_rivers',
  lakes: 'largest_lakes',
  mountains: 'highest_mountains',
}

export default function ExplorePage() {
  const { t } = useTranslation()
  const geo = useGeoData()
  const [query, setQuery] = useState('')
  useDocumentTitle(t('explore.title'))
  const countries = useMemo(
    () =>
      geo.countries
        .filter(
          (country) =>
            country.attributes.independent !== false &&
            normalizeAnswer(country.names.de).includes(normalizeAnswer(query)),
        )
        .sort((a, b) => a.names.de.localeCompare(b.names.de)),
    [geo.countries, query],
  )
  return (
    <Page wide>
      <header className="simple-page-heading">
        <h1>Entdecken</h1>
        <p>Ein Land kennenlernen oder etwas Neues finden.</p>
      </header>
      <label className="simple-country-search">
        <Search aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Welches Land interessiert dich?"
          aria-label="Land suchen"
        />
      </label>
      <section aria-label="Länder nach Kontinent" className="simple-continent-list">
        {CONTINENTS.map((continent) => {
          const list = countries.filter((country) => country.attributes.continent === continent)
          if (query && !list.length) return null
          return (
            <details className="simple-disclosure" key={continent} open={query ? true : undefined}>
              <summary>
                <span>
                  {t(`scope.${continent}`)} <small>{list.length} Länder</small>
                </span>
                <ChevronDown aria-hidden />
              </summary>
              <div className="simple-country-list">
                {list.map((country) => (
                  <Link
                    key={country.id}
                    to={`/country/${country.attributes.iso2}`}
                    aria-label={country.names.de}
                  >
                    <Flag entity={country} size="sm" />
                    <span>{country.names.de}</span>
                    <ArrowRight aria-hidden />
                  </Link>
                ))}
              </div>
            </details>
          )
        })}
        {query && !countries.length && <p role="status">Kein Land gefunden. Versuche einen anderen Namen.</p>}
      </section>
      <section className="simple-explore-lists">
        <h2>Die Welt in Zahlen</h2>
        <nav aria-label="Geographische Listen">
          {Object.entries(LISTS).map(([id, key]) => (
            <Link key={id} to={`/explore/${id}`}>
              <span>{t(`explore.${key}`)}</span>
              <ArrowRight aria-hidden />
            </Link>
          ))}
        </nav>
      </section>
    </Page>
  )
}
