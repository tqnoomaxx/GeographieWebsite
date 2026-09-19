import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { buildCollections } from '@/config/collections'
import { inScope } from '@/engine/scope'
import { normalizeAnswer } from '@/engine/normalize'
import { getRepository } from '@/services/progress'
import type { CategoryId } from '@/engine/types'
import { Page, Card, Flag, entityPath } from '@/ui'
import { Icons } from '@/ui/icons'

/** Lernkarten-Explorer: alle Flaggen einer Sammlung mit Namen, Suche und Lernstand – wie der Flaggenatlas der Vorgängerversion. */
export default function CardsPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const geo = useGeoData()
  const category = (params.get('category') as CategoryId) ?? 'flags'
  const collections = useMemo(() => (geo.index ? buildCollections(geo.index, geo.byId, 'flags') : []), [geo.index, geo.byId])
  const colId = params.get('collection') ?? 'countries'
  const col = collections.find((c) => c.id === colId) ?? collections[0]
  useDocumentTitle(col ? `${t('setup.cards')} · ${col.title}` : t('setup.cards'))
  const [q, setQ] = useState('')
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [hide, setHide] = useState(false)
  const { data: progress } = useAsync(() => getRepository().getAllEntityProgress(), [])
  useEffect(() => {
    if (!geo.regionsLoaded) void geo.ensureRegions()
  }, [geo])
  const items = useMemo(() => {
    if (!col) return []
    const list = [...(col.kinds.includes('country') ? geo.countries : []), ...(col.kinds.includes('region') ? geo.regions : [])]
      .filter((e) => e.media?.some((m) => m.kind === 'flag') && inScope(e, col.scope, geo.byId))
    const n = normalizeAnswer(q)
    return (n ? list.filter((e) => normalizeAnswer(e.names.de).includes(n) || (e.aliases ?? []).some((a) => normalizeAnswer(a).includes(n)) || (e.attributes.code as string | undefined)?.toLowerCase().includes(n)) : list).sort((a, b) => a.names.de.localeCompare(b.names.de))
  }, [col, geo.countries, geo.regions, geo.byId, q])
  const state = (id: string) => progress?.get(id)?.state ?? 'new'
  const dot: Record<string, string> = { new: 'bg-line', learning: 'bg-warn', familiar: 'bg-accent', mastered: 'bg-ok' }
  return (
    <Page title={t('setup.cards')} back={`/play/${category}`}>
      <div className="mb-3 flex flex-wrap gap-2">
        <select className="min-h-11 flex-1 rounded-xl border border-line bg-card px-3" value={col?.id} onChange={(e) => setParams({ category, collection: e.target.value })} aria-label={t('setup.cards')}>
          {collections.filter((c) => c.id !== 'random' && c.id !== 'europe-map').map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search.placeholder')} className="min-h-11 flex-1 rounded-xl border border-line bg-card px-3" aria-label={t('nav.search')} />
        <button type="button" className={`chip ${hide ? 'chip-active' : ''}`} aria-pressed={hide} onClick={() => { setHide((h) => !h); setRevealed(new Set()) }}>
          <Icons.learn className="mr-1 h-4 w-4" /> {t('cards.hide_names')}
        </button>
      </div>
      <p className="mb-3 text-sm text-ink-2">{items.length} {t('cards.items')} · {items.filter((e) => ['familiar', 'mastered'].includes(state(e.id))).length} {t('cards.known')}</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((e) => {
          const shown = !hide || revealed.has(e.id)
          return (
            <li key={e.id}>
              <button type="button" onClick={() => hide && setRevealed((s) => new Set(s).add(e.id))} className="card flex w-full flex-col items-center gap-2 p-3 text-center hover:bg-card-2">
                <Flag entity={e} size="md" className="h-14" />
                <span className="flex items-center gap-1.5 text-sm font-medium leading-tight">
                  <span className={`inline-block h-2 w-2 rounded-full ${dot[state(e.id)]}`} aria-label={state(e.id)} />
                  {shown ? e.names.de : '?'}
                </span>
              </button>
              {shown && <Link to={entityPath(e)} className="mt-1 block text-center text-xs text-ink-2 underline">{t('nav.explore')}</Link>}
            </li>
          )
        })}
      </ul>
      {col && (
        <div className="sticky bottom-16 mt-4 md:bottom-4">
          <Card className="flex items-center gap-3 bg-card/95 backdrop-blur">
            <span className="flex-1 text-sm font-medium">{col.title}</span>
            <Link to={`/play/${category}`} className="btn-primary py-2">{t('nav.play')} <Icons.arrow className="h-4 w-4" /></Link>
          </Card>
        </div>
      )}
    </Page>
  )
}
