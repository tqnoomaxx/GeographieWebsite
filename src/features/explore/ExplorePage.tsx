import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import { Page, Flag } from '@/ui'
import { Icons, IconTile } from '@/ui/icons'
import { Ruler, Users, Landmark, Waves, Droplets, Mountain } from 'lucide-react'
import type { Country } from '@/domain/types'

const CONTINENTS = ['europe', 'asia', 'africa', 'north-america', 'south-america', 'oceania'] as const

export default function ExplorePage() {
  const { t } = useTranslation()
  useDocumentTitle(t('explore.title'))
  const geo = useGeoData()
  const lists = [
    { id: 'largest', icon: Ruler, tone: 'tone-indigo', label: t('explore.largest_countries') },
    { id: 'populous', icon: Users, tone: 'tone-slate', label: t('explore.most_populous') },
    { id: 'landmarks', icon: Landmark, tone: 'tone-amber', label: t('explore.landmarks') },
    { id: 'rivers', icon: Waves, tone: 'tone-blue', label: t('explore.longest_rivers') },
    { id: 'lakes', icon: Droplets, tone: 'tone-teal', label: t('explore.largest_lakes') },
    { id: 'mountains', icon: Mountain, tone: 'tone-green', label: t('explore.highest_mountains') },
  ]
  return (
    <Page wide>
      <header className="explore-masthead">
        <div><span>WELTREGISTER · 04</span><h1>{t('explore.title')}</h1></div>
        <p>Orte, Zahlen und Extreme.<br />Systematisch, aber nie trocken.</p>
        <Link to="/search" className="explore-search" aria-label={t('nav.search')}><Icons.search /> Suchen</Link>
      </header>
      <section className="explore-layout">
        <div className="explore-lists">
          <header><span>01</span><h2>{t('explore.lists')}</h2></header>
        {lists.map((l) => (
          <Link key={l.id} to={`/explore/${l.id}`} className="explore-list-row">
            <span className="explore-row-index">{String(lists.indexOf(l) + 1).padStart(2, '0')}</span>
            <IconTile icon={l.icon} tone={l.tone} size="sm" />
            <strong>{l.label}</strong>
            <Icons.arrow aria-hidden />
          </Link>
        ))}
        </div>
        <div className="explore-continents">
          <header><span>02</span><h2>{t('explore.continents')}</h2></header>
          <div className="explore-continent-grid">
        {CONTINENTS.map((c) => {
          const countries = geo.countries.filter((x) => x.attributes.continent === c && (x as Country).attributes.independent !== false).sort((a, b) => a.names.de.localeCompare(b.names.de))
          return (
            <section key={c} className="explore-continent-sheet">
              <h3>
                <span>{t(`scope.${c}`)}</span>
                <span>{countries.length}</span>
              </h3>
              <ul>
                {countries.map((x) => (
                  <li key={x.id}>
                    <Link to={`/country/${x.attributes.iso2}`}>
                      <Flag entity={x} size="sm" />
                      <span className="truncate">{x.names.de}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
          </div>
        </div>
      </section>
    </Page>
  )
}
