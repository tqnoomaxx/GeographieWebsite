import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { CATEGORIES, ROUND_LENGTHS } from '@/config/categories'
import { MODES, type ModeDef } from '@/config/modes'
import { SCOPES } from '@/engine/scope'
import { poolFor } from '@/engine/session'
import type { CategoryId, GeneratorContext } from '@/engine/types'
import type { Entity } from '@/domain/types'
import { getRepository } from '@/services/progress'
import { Page, Card, Chips, ProgressBar } from '@/ui'
import { CATEGORY_ICONS, CATEGORY_TONES, Icons, IconTile } from '@/ui/icons'
import { entityFilterFor, toQuery, type Kind } from './setup'

const REGION_CATEGORIES: CategoryId[] = ['regions', 'cities', 'maps', 'mixed', 'flags']
const PLATE_CATEGORIES: CategoryId[] = ['license_plates', 'mixed']
/** Kategorien, in denen ein einzelnes Land als Bereich wählbar ist (Bundesländer, Kennzeichen, Städte eines Landes …). */
const PER_COUNTRY: CategoryId[] = ['flags', 'regions', 'maps', 'cities', 'license_plates', 'water', 'nature', 'images', 'landmarks', 'mixed']
/** Kategorien mit Inhaltsfilter Länder / Regionen / Alles. */
const KIND_CATEGORIES: CategoryId[] = ['flags', 'maps']
/** Weniger Lernkarten ergeben keine sinnvolle Runde (vier Antwortoptionen). */
const MIN_POOL = 4

interface Setup {
  scope: string
  kinds: Kind[]
  mode: string
  length: number | 'all'
  repeat: boolean
}

function defaultSetup(category: CategoryId): Setup {
  return { scope: category === 'regions' || category === 'license_plates' ? 'country:DE' : 'world', kinds: ['country'], mode: 'auto', length: 10, repeat: true }
}

function loadSetup(category: CategoryId): Setup {
  try {
    const raw = localStorage.getItem(`gk.setup.${category}`)
    return raw ? { ...defaultSetup(category), ...(JSON.parse(raw) as Partial<Setup>) } : defaultSetup(category)
  } catch {
    return defaultSetup(category)
  }
}

const isCountryScope = (scope: string) => scope.startsWith('country:')

export default function PlayStartPage() {
  const { category } = useParams<{ category?: CategoryId }>()
  const { data: open } = useAsync(() => getRepository().getOpenSessions(), [])
  if (!category) return <CategoryHub open={open ?? []} />
  return <Setup key={category} category={category} />
}

function Setup({ category }: { category: CategoryId }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const geo = useGeoData()
  useDocumentTitle(t(`category.${category}`))
  const def = CATEGORIES.find((c) => c.id === category)
  const [setup, setSetup] = useState<Setup>(() => loadSetup(category))
  const patch = (p: Partial<Setup>) => setSetup((s) => ({ ...s, ...p }))
  const { data: progress } = useAsync(() => getRepository().getAllEntityProgress(), [])

  useEffect(() => {
    if (REGION_CATEGORIES.includes(category) && !geo.regionsLoaded) void geo.ensureRegions()
    if (PLATE_CATEGORIES.includes(category) && !geo.platesLoaded) void geo.ensurePlates()
  }, [category, geo])

  // Kontexte je Bereich einmal pro Datenstand bauen
  const ctxCache = useMemo(() => new Map<string, GeneratorContext>(), [geo])
  const ctxFor = (scope: string) => {
    let c = ctxCache.get(scope)
    if (!c) ctxCache.set(scope, (c = geo.contextFor(scope)))
    return c
  }
  const withKinds = <T extends { entity: Entity }>(pool: Map<string, T>, kinds?: Kind[]) => {
    const f = entityFilterFor(kinds)
    if (f) for (const id of [...pool.keys()]) if (!f(pool.get(id)!.entity)) pool.delete(id)
    return pool
  }
  const countFor = (scope: string, gens?: string[], kinds?: Kind[]) => (geo.ready ? withKinds(poolFor(category, ctxFor(scope), gens), kinds).size : 0)

  const usesKinds = KIND_CATEGORIES.includes(category)
  const worldPool = useMemo(() => (geo.ready ? poolFor(category, ctxFor('world')) : new Map<string, { entity: Entity }>()), [geo.ready, category, ctxCache]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Kontinente mit genug Lernkarten */
  const continents = useMemo(() => SCOPES.filter((s) => s !== 'world' && countFor(s) >= MIN_POOL), [geo.ready, category, ctxCache]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Länder mit genug Lernkarten (aus dem Welt-Pool abgeleitet, ohne je einen Kontext zu bauen) */
  const countries = useMemo(() => {
    if (!PER_COUNTRY.includes(category)) return []
    const counts = new Map<string, number>()
    for (const { entity: e } of worldPool.values()) {
      if (usesKinds && e.type === 'country') continue // in einem Land zählen nur seine Regionen
      const ids = (e.attributes.countries as string[] | undefined) ?? (e.attributes.country ? [e.attributes.country] : [])
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return [...counts.entries()]
      .filter(([, n]) => n >= MIN_POOL)
      .map(([id, n]) => ({ country: geo.byId.get(id), n }))
      .filter((x): x is { country: Entity; n: number } => !!x.country)
      .sort((a, b) => a.country.names.de.localeCompare(b.country.names.de))
  }, [worldPool, category, usesKinds, geo.byId])
  const countryGroups = useMemo(() => {
    const groups = new Map<string, typeof countries>()
    for (const c of countries) {
      const cont = (c.country.attributes.continent as string) ?? 'world'
      groups.set(cont, [...(groups.get(cont) ?? []), c])
    }
    return [...SCOPES.filter((s) => groups.has(s)), ...[...groups.keys()].filter((k) => !SCOPES.includes(k as (typeof SCOPES)[number]))].map((k) => [k, groups.get(k)!] as const)
  }, [countries])

  const loading = !geo.ready || (REGION_CATEGORIES.includes(category) && !geo.regionsLoaded) || (PLATE_CATEGORIES.includes(category) && !geo.platesLoaded)
  // Ungültig gewordene Auswahl (z. B. Bereich ohne Karten) still auf „Welt“ zurücksetzen
  const scopeValid = loading || setup.scope === 'world' || continents.includes(setup.scope as (typeof SCOPES)[number]) || countries.some((c) => c.country.id === setup.scope)
  const scope = scopeValid ? setup.scope : 'world'

  const kindOptions = useMemo(() => {
    if (!usesKinds || isCountryScope(scope)) return []
    return ([['country'], ['region'], ['country', 'region']] as Kind[][]).filter((k) => countFor(scope, undefined, k) >= MIN_POOL)
  }, [usesKinds, scope, geo.ready, ctxCache]) // eslint-disable-line react-hooks/exhaustive-deps
  const kindKey = (k: Kind[]) => k.join('+')
  const kinds: Kind[] | undefined = !usesKinds ? undefined : isCountryScope(scope) ? ['region'] : kindOptions.find((k) => kindKey(k) === kindKey(setup.kinds)) ?? kindOptions[0] ?? ['country']

  const modes = useMemo(
    () => (MODES[category] ?? []).filter((m) => (!m.scopes || m.scopes.includes(scope)) && countFor(scope, m.generators, m.kinds ?? kinds) >= MIN_POOL),
    [category, scope, kinds, geo.ready, ctxCache], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const mode: ModeDef | undefined = modes.find((m) => m.id === setup.mode)
  const effectiveKinds = mode?.kinds ?? kinds
  const generatorIds = mode?.generators

  const pool = useMemo(() => (geo.ready ? withKinds(poolFor(category, ctxFor(scope), generatorIds), effectiveKinds) : new Map<string, { entity: Entity }>()), [category, scope, generatorIds, effectiveKinds, geo.ready, ctxCache]) // eslint-disable-line react-hooks/exhaustive-deps
  const poolSize = pool.size
  const mastered = useMemo(() => (progress ? [...pool.keys()].filter((id) => ['familiar', 'mastered'].includes(progress.get(id)?.state ?? '')).length : 0), [pool, progress])

  const lengths = [...ROUND_LENGTHS.filter((l) => l < poolSize).map((l) => ({ value: l as number | 'all', label: String(l) })), { value: 'all' as const, label: t('play.all', { count: poolSize }) }]
  const length: number | 'all' = mode?.length ?? (lengths.some((l) => l.value === setup.length) ? setup.length : 'all')

  const start = () => {
    localStorage.setItem(`gk.setup.${category}`, JSON.stringify({ ...setup, scope, kinds: kinds ?? setup.kinds, mode: mode?.id ?? 'auto', length }))
    navigate(`/play/${category}/round?${toQuery({ category, scope, length, gens: generatorIds, kinds: effectiveKinds, repeat: setup.repeat })}`)
  }

  const scopeLabel = isCountryScope(scope) ? geo.byId.get(scope)?.names.de ?? scope : t(`scope.${scope}`)
  const kindsLabel = effectiveKinds && effectiveKinds.length === 1 && !isCountryScope(scope) ? ` · ${t(`setup.kinds.${category}.${effectiveKinds[0]}`)}` : ''
  const cardsCollection = category === 'flags' ? (isCountryScope(scope) ? `regions-${geo.byId.get(scope)?.attributes.iso2 as string}` : effectiveKinds?.length === 1 && effectiveKinds[0] === 'country' ? (scope === 'world' ? 'countries' : scope) : 'all') : undefined

  return (
    <Page title={t(`category.${category}`)} back="/play" action={def && <IconTile icon={CATEGORY_ICONS[def.id]} tone={CATEGORY_TONES[def.id]} size="sm" />}>
      <Section title={t('play.scope')}>
        <Chips label={t('play.scope')} value={isCountryScope(scope) ? '' : scope} onChange={(v) => patch({ scope: v })} items={['world', ...continents].map((s) => ({ value: s as string, label: t(`scope.${s}`) }))} />
        {countries.length > 0 && (
          <select className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-3 text-sm" value={isCountryScope(scope) ? scope : ''} onChange={(e) => e.target.value && patch({ scope: e.target.value })} aria-label={t('setup.country_pick')}>
            <option value="">{t('setup.country_pick')}</option>
            {countryGroups.map(([cont, list]) => (
              <optgroup key={cont} label={t(`scope.${cont}`)}>
                {list.map(({ country, n }) => (
                  <option key={country.id} value={country.id}>
                    {country.names.de} ({n})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
        {kindOptions.length > 1 && kinds && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-2">{t('setup.kinds_label')}:</span>
            <Chips label={t('setup.kinds_label')} value={kindKey(kinds)} onChange={(v) => patch({ kinds: v.split('+') as Kind[] })} items={kindOptions.map((k) => ({ value: kindKey(k), label: k.length === 2 ? t('setup.kinds.all') : t(`setup.kinds.${category}.${k[0]}`) }))} />
          </div>
        )}
      </Section>

      {modes.length > 0 && (
        <Section title={t('setup.mode')}>
          <Chips label={t('setup.mode')} value={mode?.id ?? 'auto'} onChange={(v) => patch({ mode: v })} items={[{ value: 'auto', label: t('modes.auto') }, ...modes.map((m) => ({ value: m.id, label: t(`modes.${m.id}`) }))]} />
          <p className="mt-2 text-xs text-ink-2">{mode ? t(`modes_desc.${mode.id}`, { defaultValue: '' }) : t('setup.auto_desc')}</p>
        </Section>
      )}

      <Section title={t('play.length')}>
        {mode?.length === 'all' ? <p className="text-sm text-ink-2">{t('setup.europe_note', { count: poolSize })}</p> : <Chips label={t('play.length')} value={length} onChange={(v) => patch({ length: v })} items={lengths} />}
        {mode?.length !== 'all' && (
          <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent)]" checked={setup.repeat} onChange={(e) => patch({ repeat: e.target.checked })} />
            <span>
              <span className="block font-medium">{t('setup.repeat')}</span>
              <span className="block text-xs text-ink-2">{t('setup.repeat_desc')}</span>
            </span>
          </label>
        )}
      </Section>

      <div className="sticky bottom-16 z-30 md:bottom-4">
        <Card className="flex items-center gap-3 bg-card/95 backdrop-blur">
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium">
              {scopeLabel}
              {kindsLabel}
            </p>
            <p className="text-xs text-ink-2">{loading ? t('common.loading') : t('setup.mastered', { mastered, total: poolSize })}</p>
          </div>
          {cardsCollection && (
            <Link to={`/learn/cards?category=${category}&collection=${cardsCollection}`} className="btn-secondary hidden py-2 md:inline-flex">
              <Icons.learn className="h-4 w-4" /> {t('setup.cards')}
            </Link>
          )}
          <button className="btn-primary" onClick={start} disabled={poolSize < MIN_POOL}>
            {t('play.start')} <Icons.arrow className="h-4 w-4" />
          </button>
        </Card>
      </div>
      {poolSize < MIN_POOL && !loading && <p className="mt-3 text-sm text-ink-2">{t('play.no_questions')}</p>}
    </Page>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function CategoryHub({ open }: { open: Awaited<ReturnType<ReturnType<typeof getRepository>['getOpenSessions']>> }) {
  const { t } = useTranslation()
  const geo = useGeoData()
  useDocumentTitle(t('nav.play'))
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
                    <p className="truncate text-sm font-medium">
                      {t(`category.${s.category}`)} · {s.scope.startsWith('country:') ? geo.byId.get(s.scope)?.names.de : t(`scope.${s.scope}`)} · {s.position} / {total}
                    </p>
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
