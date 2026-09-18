import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import { Page, Card, Flag } from '@/ui'
import type { Country } from '@/domain/types'

const CONTINENTS = ['europe', 'asia', 'africa', 'north-america', 'south-america', 'oceania'] as const

export default function ExplorePage() {
  const { t } = useTranslation()
  useDocumentTitle(t('explore.title'))
  const geo = useGeoData()
  const lists = [
    { id: 'largest', icon: '📐', label: t('explore.largest_countries') },
    { id: 'populous', icon: '👥', label: t('explore.most_populous') },
    { id: 'landmarks', icon: '🏛️', label: t('explore.landmarks') },
    { id: 'rivers', icon: '🌊', label: t('explore.longest_rivers') },
    { id: 'lakes', icon: '💧', label: t('explore.largest_lakes') },
    { id: 'mountains', icon: '🏔️', label: t('explore.highest_mountains') },
  ]
  return (
    <Page title={`🧭 ${t('explore.title')}`} action={<Link to="/search" className="btn-ghost px-3" aria-label={t('nav.search')}>🔎</Link>}>
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('explore.lists')}</h2>
      <div className="mb-6 grid gap-2 md:grid-cols-3">
        {lists.map((l) => (
          <Link key={l.id} to={`/explore/${l.id}`} className="card flex items-center gap-3 p-3 hover:bg-card-2">
            <span className="text-xl" aria-hidden>{l.icon}</span>
            <span className="font-medium">{l.label}</span>
          </Link>
        ))}
      </div>
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('explore.continents')}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {CONTINENTS.map((c) => {
          const countries = geo.countries.filter((x) => x.attributes.continent === c && (x as Country).attributes.independent !== false).sort((a, b) => a.names.de.localeCompare(b.names.de))
          return (
            <Card key={c} as="section">
              <h3 className="mb-2 flex items-center justify-between font-semibold">
                <span>{t(`scope.${c}`)}</span>
                <span className="text-xs font-normal text-ink-2">{countries.length}</span>
              </h3>
              <ul className="grid grid-cols-2 gap-1 text-sm">
                {countries.map((x) => (
                  <li key={x.id}>
                    <Link to={`/country/${x.attributes.iso2}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-card-2">
                      <Flag entity={x} size="sm" />
                      <span className="truncate">{x.names.de}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </div>
    </Page>
  )
}
