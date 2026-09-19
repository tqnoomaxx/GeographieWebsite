import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { CATEGORIES, ROUND_LENGTHS } from '@/config/categories'
import { MODES } from '@/config/modes'
import { COLLECTION_CATEGORIES, GROUP_ORDER, buildCollections, type CollectionDef } from '@/config/collections'
import { SCOPES } from '@/engine/scope'
import { poolFor } from '@/engine/session'
import type { CategoryId } from '@/engine/types'
import { getRepository } from '@/services/progress'
import { Page, Card, Chips, ProgressBar, Flag } from '@/ui'
import { CATEGORY_ICONS, CATEGORY_TONES, Icons, IconTile } from '@/ui/icons'
import { entityFilterFor, toQuery } from './setup'

const REGION_CATEGORIES: CategoryId[] = ['regions', 'cities', 'maps', 'mixed', 'flags']
const PLATE_CATEGORIES: CategoryId[] = ['license_plates', 'mixed']

export default function PlayStartPage() {
  const { t } = useTranslation()
  const { category } = useParams<{ category?: CategoryId }>()
  const navigate = useNavigate()
  const geo = useGeoData()
  useDocumentTitle(category ? t(`category.${category}`) : t('nav.play'))
  const useCollections = !!category && COLLECTION_CATEGORIES.includes(category)
  const collections = useMemo(() => (useCollections && geo.index ? buildCollections(geo.index, geo.byId, category!) : []), [useCollections, geo.index, geo.byId, category])
  const [collectionId, setCollectionId] = useState<string>(() => localStorage.getItem(`gk.col.${category}`) ?? (category === 'regions' ? 'regions-DE' : 'countries'))
  const collection: CollectionDef | undefined = collections.find((c) => c.id === collectionId) ?? collections[0]
  const [scope, setScope] = useState<string>(() => localStorage.getItem('gk.scope') ?? 'world')
  const effectiveScope = useCollections ? (collection?.scope ?? 'world') : scope
  const [length, setLength] = useState<number | 'all'>(() => {
    const v = localStorage.getItem(`gk.len.${category}`)
    return v === 'all' ? 'all' : v ? Number(v) : 10
  })
  const [repeat, setRepeat] = useState(() => localStorage.getItem('gk.repeat') !== '0')
  const modes = category ? MODES[category] ?? [] : []
  const [mode, setMode] = useState<string>(() => localStorage.getItem(`gk.mode.${category}`) ?? 'auto')
  const forcedMode = collection?.mode
  const activeMode = forcedMode ?? mode
  const generatorIds = activeMode === 'auto' ? undefined : activeMode === 'europe_map' ? ['flag_to_europe_map'] : modes.find((m) => m.id === activeMode)?.generators
  const { data: open } = useAsync(() => getRepository().getOpenSessions(), [])
  const { data: progress } = useAsync(() => getRepository().getAllEntityProgress(), [])

  useEffect(() => {
    if (category && REGION_CATEGORIES.includes(category) && !geo.regionsLoaded) void geo.ensureRegions()
    if (category && PLATE_CATEGORIES.includes(category) && !geo.platesLoaded) void geo.ensurePlates()
  }, [category, geo])

  const pool = useMemo(() => {
    if (!category || !geo.ready) return new Map()
    const p = poolFor(category, geo.contextFor(effectiveScope), generatorIds)
    const f = entityFilterFor(collection?.kinds)
    if (useCollections && f) for (const id of [...p.keys()]) if (!f(p.get(id)!.entity)) p.delete(id)
    return p
  }, [category, effectiveScope, geo, generatorIds, collection, useCollections])
  const poolSize = pool.size
  const mastered = useMemo(() => (progress ? [...pool.keys()].filter((id) => ['familiar', 'mastered'].includes(progress.get(id)?.state ?? '')).length : 0), [pool, progress])

  const countryScopes = useMemo(() => {
    if (!category || useCollections || !['mixed', 'cities', 'license_plates'].includes(category) || !geo.index) return []
    const ids = category === 'license_plates' ? Object.keys(geo.index.plates ?? {}).map((iso) => `country:${iso}`) : Object.keys(geo.index.regions)
    return ids.map((id) => geo.byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c).sort((a, b) => a.names.de.localeCompare(b.names.de))
  }, [category, geo, useCollections])

  if (!category) return <CategoryHub open={open ?? []} />

  const def = CATEGORIES.find((c) => c.id === category)
  const start = () => {
    localStorage.setItem('gk.scope', scope)
    localStorage.setItem(`gk.len.${category}`, String(length))
    localStorage.setItem(`gk.mode.${category}`, mode)
    localStorage.setItem('gk.repeat', repeat ? '1' : '0')
    if (collection) localStorage.setItem(`gk.col.${category}`, collection.id)
    navigate(`/play/${category}/round?${toQuery({ category, scope: effectiveScope, length, gens: generatorIds, collection: useCollections ? collection?.id : undefined, kinds: useCollections ? collection?.kinds : undefined, repeat })}`)
  }
  const lengths = [...ROUND_LENGTHS.filter((l) => l < poolSize).map((l) => ({ value: l as number | 'all', label: String(l) })), { value: 'all' as const, label: t('play.all', { count: poolSize }) }]
  const grouped = GROUP_ORDER.map((g) => [g, collections.filter((c) => c.group === g)] as const).filter(([, list]) => list.length)
  const sample = pool.size ? [...pool.values()][0].entity : undefined
  let step = 0
  const Step = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
    <section className="mb-6">
      <div className="mb-2 flex items-baseline gap-3">
        <span className="text-xs font-semibold tracking-wider text-accent">0{++step}</span>
        <h2 className="font-semibold">{title}</h2>
        {hint && <span className="text-xs text-ink-2">{hint}</span>}
      </div>
      {children}
    </section>
  )

  return (
    <Page title={t(`category.${category}`)} back="/play" action={def && <IconTile icon={CATEGORY_ICONS[def.id]} tone={CATEGORY_TONES[def.id]} size="sm" />}>
      {useCollections ? (
        <Step title={t('setup.collection')} hint={t('setup.collection_hint')}>
          {grouped.map(([group, list]) => (
            <div key={group} className="mb-3">
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-ink-2">{group}</h3>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {list.map((c) => {
                  const active = collection?.id === c.id
                  const country = c.countryIso ? geo.countries.find((x) => x.attributes.iso2 === c.countryIso) : undefined
                  const count = c.countryIso ? geo.index?.regions[`country:${c.countryIso}`]?.count : undefined
                  return (
                    <button key={c.id} type="button" aria-pressed={active} onClick={() => setCollectionId(c.id)} className={`card flex items-start gap-2.5 p-3 text-left transition ${active ? 'border-accent ring-2 ring-accent/30' : 'hover:bg-card-2'}`}>
                      {country ? <Flag entity={country} size="sm" className="mt-0.5 shrink-0" /> : <span className="mt-0.5 inline-flex h-6 w-9 shrink-0 items-center justify-center rounded-md tone-indigo"><Icons.globe className="h-4 w-4" /></span>}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{c.shortTitle ?? c.title}</span>
                        <span className="block text-xs text-ink-2 line-clamp-2">{c.description}</span>
                        {count !== undefined && <span className="text-xs text-ink-2">{count} Flaggen</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </Step>
      ) : (
        <Step title={t('play.scope')}>
          <Chips label={t('play.scope')} value={scope} onChange={setScope} items={SCOPES.map((s) => ({ value: s as string, label: t(`scope.${s}`) }))} />
          {countryScopes.length > 0 && (
            <select className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-3" value={scope.startsWith('country:') ? scope : ''} onChange={(e) => e.target.value && setScope(e.target.value)} aria-label={t('facts.country')}>
              <option value="">{t('facts.country')} …</option>
              {countryScopes.map((c) => (
                <option key={c.id} value={c.id}>{c.names.de}</option>
              ))}
            </select>
          )}
        </Step>
      )}

      {modes.length > 0 && !forcedMode && (
        <Step title={t('setup.mode')} hint={t('setup.mode_hint')}>
          <div className="grid gap-2 md:grid-cols-2">
            {[{ id: 'auto', generators: [] as string[] }, ...modes].map((m) => {
              const active = mode === m.id
              const size = m.id === 'auto' ? poolSize : geo.ready ? poolFor(category, geo.contextFor(effectiveScope), m.generators).size : 0
              const disabled = m.id !== 'auto' && size === 0
              return (
                <button key={m.id} type="button" disabled={disabled} aria-pressed={active} onClick={() => setMode(m.id)} className={`card flex items-center gap-3 p-3 text-left transition disabled:opacity-40 ${active ? 'border-accent ring-2 ring-accent/30' : 'hover:bg-card-2'}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{t(`modes.${m.id}`)}</span>
                    <span className="block text-xs text-ink-2">{t(`modes_desc.${m.id}`, { defaultValue: '' })}</span>
                  </span>
                  {m.id !== 'auto' && <span className="text-xs tabular-nums text-ink-2">{size}</span>}
                </button>
              )
            })}
          </div>
        </Step>
      )}
      {forcedMode === 'europe_map' && (
        <Card className="mb-6 flex items-center gap-3 text-sm">
          <IconTile icon={Icons.pin} tone="tone-green" size="sm" />
          <span>{t('setup.europe_note', { count: poolSize })}</span>
        </Card>
      )}

      {!forcedMode && (
        <Step title={t('setup.training')} hint={t('setup.training_hint')}>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={repeat} onClick={() => setRepeat(true)} className={`card p-3 text-left ${repeat ? 'border-accent ring-2 ring-accent/30' : 'hover:bg-card-2'}`}>
              <span className="block text-sm font-medium">{t('setup.repeat')}</span>
              <span className="block text-xs text-ink-2">{t('setup.repeat_desc')}</span>
            </button>
            <button type="button" aria-pressed={!repeat} onClick={() => setRepeat(false)} className={`card p-3 text-left ${!repeat ? 'border-accent ring-2 ring-accent/30' : 'hover:bg-card-2'}`}>
              <span className="block text-sm font-medium">{t('setup.classic')}</span>
              <span className="block text-xs text-ink-2">{t('setup.classic_desc')}</span>
            </button>
          </div>
        </Step>
      )}

      <Step title={t('play.length')}>
        {forcedMode === 'europe_map' ? <p className="text-sm text-ink-2">{poolSize} · {t('setup.complete')}</p> : <Chips label={t('play.length')} value={length} onChange={setLength} items={lengths} />}
      </Step>

      <div className="sticky bottom-16 z-30 md:bottom-4">
        <Card className="flex items-center gap-3 bg-card/95 backdrop-blur">
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium">{useCollections ? collection?.title : t(`scope.${scope}`, { defaultValue: geo.byId.get(scope)?.names.de })}</p>
            <p className="text-xs text-ink-2">{t('setup.mastered', { mastered, total: poolSize })}{sample && activeMode !== 'auto' ? ` · ${t(`modes.${activeMode}`)}` : ''}</p>
          </div>
          {useCollections && collection && <Link to={`/learn/cards?category=${category}&collection=${collection.id}`} className="btn-secondary hidden py-2 md:inline-flex"><Icons.learn className="h-4 w-4" /> {t('setup.cards')}</Link>}
          <button className="btn-primary" onClick={start} disabled={poolSize === 0}>{t('play.start')} <Icons.arrow className="h-4 w-4" /></button>
        </Card>
      </div>
      {poolSize === 0 && geo.ready && <p className="mt-3 text-sm text-ink-2">{t('play.no_questions')}</p>}
    </Page>
  )
}

function CategoryHub({ open }: { open: Awaited<ReturnType<ReturnType<typeof getRepository>['getOpenSessions']>> }) {
  const { t } = useTranslation()
  const geo = useGeoData()
  return (
    <Page title={t('play.title')}>
      {open.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('play.open_runs')}</h2>
          <div className="grid gap-2">
            {open.slice(0, 2).map((s) => {
              const total = s.questions.length + (s.remaining?.length ?? 0)
              return (
                <Link key={s.id} to={`/play/session/${encodeURIComponent(s.id)}`} className="card flex items-center gap-3 p-3 hover:bg-card-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t(`category.${s.category}`)} · {s.scope.startsWith('country:') ? geo.byId.get(s.scope)?.names.de : t(`scope.${s.scope}`)} · {s.position} / {total}</p>
                    <ProgressBar className="mt-1" value={s.position / total} />
                  </div>
                  <span className="btn-secondary py-2">{t('app.continue')}</span>
                </Link>
              )
            })}
            {open.length > 2 && <p className="text-xs text-ink-2">{t('play.more_open', { count: open.length - 2 })}</p>}
          </div>
        </section>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {CATEGORIES.map((c) => (
          <Link key={c.id} to={`/play/${c.id}`} className="card flex items-center gap-3 p-3 hover:bg-card-2">
            <IconTile icon={CATEGORY_ICONS[c.id]} tone={CATEGORY_TONES[c.id]} size="sm" />
            <span className="font-medium">{t(`category.${c.id}`)}</span>
            {c.countKey && geo.index?.counts[c.countKey] !== undefined && <span className="ml-auto text-xs text-ink-2">{geo.index.counts[c.countKey]}</span>}
          </Link>
        ))}
        <Link to="/daily" className="card flex items-center gap-3 p-3 hover:bg-card-2">
          <IconTile icon={Icons.daily} tone="tone-violet" size="sm" />
          <span className="font-medium">{t('daily.title')}</span>
        </Link>
      </div>
    </Page>
  )
}
