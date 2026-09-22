import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { AUTO, MIN_POOL, PLAY_QUIZZES, ROUND_LENGTHS, autoModes, isCategory, quizFor, type Content, type QuizMode } from '@/config/quizzes'
import { collectionFor } from '@/config/collections'
import { SCOPES } from '@/engine/scope'
import { defaultRound, isCountryScope, roundPath, type RoundConfig } from '@/engine/round'
import { baseQuestionPosition, baseQuestionTotal, poolFor, setupOf } from '@/engine/session'
import type { CategoryId, GeneratorContext } from '@/engine/types'
import type { Entity } from '@/domain/types'
import { getRepository } from '@/services/progress'
import { Page, Card, Chips, Flag, ProgressBar } from '@/ui'
import { normalizeAnswer } from '@/engine/normalize'
import { CategoryIconTile, Icons, IconTile } from '@/ui/icons'
import { RoundTitle } from './RoundLabel'

const KEY = (category: CategoryId) => `gk.setup.${category}`

function useDesktopSetup() {
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const update = () => setDesktop(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return desktop
}

function loadSetup(category: CategoryId): RoundConfig {
  try {
    const raw = localStorage.getItem(KEY(category))
    return raw ? { ...defaultRound(category), ...(JSON.parse(raw) as Partial<RoundConfig>) } : defaultRound(category)
  } catch {
    return defaultRound(category)
  }
}

export default function PlayStartPage() {
  const { category } = useParams<{ category?: string }>()
  if (!category) return <CategoryHub />
  if (!isCategory(category)) return <Navigate to="/play" replace />
  if (category === 'maps') return <Navigate to="/play/countries" replace />
  if (category === 'regions') return <Navigate to="/play/flags" replace />
  return <Setup key={category} category={category} />
}

/**
 * Rundeneinstellung in drei Schritten – Bereich, Fragetyp, Rundenlänge – vollständig aus config/quizzes.ts abgeleitet.
 * Angeboten wird nur, was mindestens MIN_POOL Lernkarten hat (R12); ungültige gespeicherte Auswahl fällt still zurück.
 */
function Setup({ category }: { category: CategoryId }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const geo = useGeoData()
  const quiz = quizFor(category)
  const desktop = useDesktopSetup()
  useDocumentTitle(t(`category.${category}`))
  const [setup, setSetup] = useState<RoundConfig>(() => loadSetup(category))
  const patch = (p: Partial<RoundConfig>) => setSetup((s) => ({ ...s, ...p }))
  const { data: progress } = useAsync(() => getRepository().getAllEntityProgress(), [])

  const needsRegions = !!quiz.needs?.includes('regions')
  const needsPlates = !!quiz.needs?.includes('plates')
  useEffect(() => {
    if (needsRegions && !geo.regionsLoaded) void geo.ensureRegions()
    if (needsPlates && !geo.platesLoaded) void geo.ensurePlates()
  }, [needsRegions, needsPlates, geo])
  const loading = !geo.ready || (needsRegions && !geo.regionsLoaded) || (needsPlates && !geo.platesLoaded)

  // Kontexte je Bereich einmal pro Datenstand bauen
  const ctxCache = useMemo(() => new Map<string, GeneratorContext>(), [geo])
  const ctxFor = (scope: string) => {
    let c = ctxCache.get(scope)
    if (!c) ctxCache.set(scope, (c = geo.contextFor(scope)))
    return c
  }
  const count = (scope: string, mode = AUTO, content?: Content[]) => (geo.ready ? poolFor(ctxFor(scope), { category, mode, content }).size : 0)

  // ---- Bereich: Welt, Kontinente und (perCountry) einzelne Länder mit genug Lernkarten
  const worldPool = useMemo(() => (geo.ready ? poolFor(ctxFor('world'), { category, mode: AUTO }) : new Map<string, { entity: Entity }>()), [geo.ready, category, ctxCache]) // eslint-disable-line react-hooks/exhaustive-deps
  const continents = useMemo(() => SCOPES.filter((s) => s !== 'world' && count(s) >= MIN_POOL), [geo.ready, category, ctxCache]) // eslint-disable-line react-hooks/exhaustive-deps
  const countries = useMemo(() => {
    if (!quiz.perCountry) return []
    const counts = new Map<string, number>()
    for (const { entity: e } of worldPool.values()) {
      if (quiz.content && e.type === 'country') continue // in einem Land zählen nur seine Regionen
      const ids = (e.attributes.countries as string[] | undefined) ?? (e.attributes.country ? [e.attributes.country] : [])
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return [...counts.entries()]
      .filter(([, n]) => n >= MIN_POOL)
      .map(([id, n]) => ({ country: geo.byId.get(id), n }))
      .filter((x): x is { country: Entity; n: number } => !!x.country)
      .sort((a, b) => a.country.names.de.localeCompare(b.country.names.de))
  }, [worldPool, quiz, geo.byId])
  const countryGroups = useMemo(() => {
    const groups = new Map<string, typeof countries>()
    for (const c of countries) {
      const cont = (c.country.attributes.continent as string) ?? 'world'
      groups.set(cont, [...(groups.get(cont) ?? []), c])
    }
    return [...SCOPES.filter((s) => groups.has(s)), ...[...groups.keys()].filter((k) => !SCOPES.includes(k as (typeof SCOPES)[number]))].map((k) => [k, groups.get(k)!] as const)
  }, [countries])
  const scopeValid = loading || setup.scope === 'world' || continents.includes(setup.scope as (typeof SCOPES)[number]) || countries.some((c) => c.country.id === setup.scope)
  const scope = scopeValid ? setup.scope : 'world'
  /** Kontinent-Chip, der zum Bereich gehört; bei einem einzelnen Land dessen Kontinent. */
  const activeContinent = isCountryScope(scope) ? ((geo.byId.get(scope)?.attributes.continent as string | undefined) ?? 'world') : scope

  // ---- Inhalt: Länder / Regionen / Alles (nur Kategorien mit `content`; in einem Land immer dessen Regionen)
  const contentOptions = useMemo(() => {
    if (!quiz.content || isCountryScope(scope)) return []
    return ([['country'], ['region'], ['country', 'region']] as Content[][]).filter((c) => count(scope, AUTO, c) >= MIN_POOL)
  }, [quiz.content, scope, geo.ready, ctxCache]) // eslint-disable-line react-hooks/exhaustive-deps
  const key = (c: Content[]) => c.join('+')
  const content: Content[] | undefined = !quiz.content ? undefined : isCountryScope(scope) ? ['region'] : contentOptions.find((c) => key(c) === key(setup.content ?? [])) ?? contentOptions[0] ?? ['country']

  // ---- Fragetyp: nur mit genug Lernkarten im gewählten Bereich
  const modes = useMemo(
    () => quiz.modes.filter((m) => (!isCountryScope(scope) || m.allowCountryScope !== false) && (!m.scopes || m.scopes.includes(scope)) && count(scope, m.id, m.content ?? content) >= MIN_POOL),
    [quiz, scope, content, geo.ready, ctxCache], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const mode: QuizMode | undefined = modes.find((m) => m.id === setup.mode)
  const effectiveContent = mode?.content ?? content

  // ---- Rundenlänge
  const pool = useMemo(() => (geo.ready ? poolFor(ctxFor(scope), { category, mode: mode?.id ?? AUTO, content: effectiveContent }) : new Map<string, { entity: Entity }>()), [category, scope, mode, effectiveContent, geo.ready, ctxCache]) // eslint-disable-line react-hooks/exhaustive-deps
  const poolSize = pool.size
  const mastered = useMemo(() => (progress ? [...pool.keys()].filter((id) => ['familiar', 'mastered'].includes(progress.get(id)?.state ?? '')).length : 0), [pool, progress])
  const lengths = [...ROUND_LENGTHS.filter((l) => l < poolSize).map((l) => ({ value: l as number | 'all', label: String(l) })), { value: 'all' as const, label: t('play.all', { count: poolSize }) }]
  const length: number | 'all' = mode?.length ?? (lengths.some((l) => l.value === setup.length) ? setup.length : 'all')

  const round: RoundConfig = { category, mode: mode?.id ?? AUTO, scope, content: effectiveContent, length, repeat: setup.repeat }
  const start = () => {
    localStorage.setItem(KEY(category), JSON.stringify({ ...round, content: content ?? setup.content, mode: setup.mode, length: mode?.length ? setup.length : length }))
    navigate(roundPath(round))
  }

  return (
    <Page wide title={t(`category.${category}`)} back="/play" action={<CategoryIconTile id={category} size="sm" />}>
      <div className="atlas-rule mb-8 h-px" />
      <div className="grid gap-8 pb-24 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-12 lg:pb-0">
      <div>
      <Section step={1} title={t('play.scope')}>
        <Chips label={t('play.scope')} value={activeContinent} onChange={(v) => patch({ scope: v })} items={['world', ...continents].map((s) => ({ value: s as string, label: t(`scope.${s}`) }))} />
        {countries.length > 0 && <CountryPicker groups={countryGroups} continent={activeContinent === 'world' ? undefined : activeContinent} value={isCountryScope(scope) ? scope : ''} onChange={(id) => patch({ scope: id || activeContinent })} />}
        {contentOptions.length > 1 && content && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-2">{t('setup.content_label')}:</span>
            <Chips label={t('setup.content_label')} value={key(content)} onChange={(v) => patch({ content: v.split('+') as Content[] })} items={contentOptions.map((c) => ({ value: key(c), label: c.length === 2 ? t('setup.content.all') : t(`setup.content.${category}.${c[0]}`) }))} />
          </div>
        )}
      </Section>

      {modes.length > 0 && (
        <Section step={2} title={t('setup.mode')}>
          <Chips label={t('setup.mode')} value={mode?.id ?? AUTO} onChange={(v) => patch({ mode: v })} items={[{ value: AUTO, label: t('modes.auto') }, ...modes.map((m) => ({ value: m.id, label: t(`modes.${m.id}`) }))]} />
          <p className="mt-2 text-xs text-ink-2">{mode ? t(`modes_desc.${mode.id}`, { defaultValue: '' }) : autoModes(quiz).some((m) => m.form === 'choice') ? t('setup.auto_desc') : t('setup.auto_desc_all')}</p>
        </Section>
      )}

      <Section step={modes.length > 0 ? 3 : 2} title={t('play.length')}>
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
      </div>

      {desktop && <aside className="sticky top-20">
        <Card className="overflow-hidden bg-card/95 p-0 backdrop-blur">
          <div className="border-b border-line bg-accent-soft/60 p-5">
            <p className="eyebrow mb-2">{t('setup.expedition')}</p>
            <RoundTitle setup={round} icon={false} />
          </div>
          <div className="p-5">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ink-2">{t('play.scope')}</dt><dd className="text-right font-medium">{isCountryScope(scope) ? geo.byId.get(scope)?.names.de : t(`scope.${scope}`)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-2">{t('setup.mode')}</dt><dd className="text-right font-medium">{mode ? t(`modes.${mode.id}`) : t('modes.auto')}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-2">{t('play.length')}</dt><dd className="text-right font-medium">{length === 'all' ? poolSize : length}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-2">{t('setup.repeat_short')}</dt><dd className="text-right font-medium">{setup.repeat ? t('setup.on') : t('setup.off')}</dd></div>
            </dl>
            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2 flex justify-between text-xs text-ink-2"><span>{loading ? t('common.loading') : t('setup.mastered', { mastered, total: poolSize })}</span><span>{poolSize ? Math.round(mastered / poolSize * 100) : 0}%</span></div>
              <ProgressBar value={poolSize ? mastered / poolSize : 0} />
            </div>
            <div className={`mt-5 grid gap-2 ${category === 'flags' ? 'sm:grid-cols-2' : ''}`}>
              {category === 'flags' && (
                <Link to={`/learn/cards?collection=${collectionFor(scope, effectiveContent, geo.byId)}`} className="btn-secondary w-full py-2">
                  <Icons.learn className="h-4 w-4" /> {t('setup.cards')}
                </Link>
              )}
              <button className="btn-primary w-full whitespace-nowrap" onClick={start} disabled={loading || poolSize < MIN_POOL}>
                {t('play.start')} <Icons.arrow className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
        {poolSize < MIN_POOL && !loading && <p className="mt-3 text-sm text-ink-2">{t('play.no_questions')}</p>}
      </aside>}
      </div>
      {!desktop && <div className="setup-mobile-cta">
        <RoundTitle setup={round} icon={false} className="min-w-0 flex-1" />
        <button className="btn-primary min-w-32" onClick={start} disabled={loading || poolSize < MIN_POOL}>
          {t('play.start')} <Icons.arrow className="h-4 w-4" />
        </button>
      </div>}
    </Page>
  )
}

type CountryGroup = readonly [string, Array<{ country: Entity; n: number }>]

/** Einzelnes Land als Bereich: Flaggen-Chips nach Kontinent, auf den gewählten Kontinent eingeschränkt, Suchfeld bei langen Listen. */
function CountryPicker({ groups, continent, value, onChange }: { groups: readonly CountryGroup[]; continent?: string; value: string; onChange: (id: string) => void }) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const shown = groups.filter(([c]) => !continent || c === continent)
  const total = shown.reduce((n, [, list]) => n + list.length, 0)
  const nq = normalizeAnswer(q)
  // Lange Listen (Welt, kein Kontinent gewählt) bleiben eingeklappt, bis gesucht oder ein Kontinent gewählt wird.
  const collapsed = total > 12 && !continent && !nq
  const filtered = collapsed ? [] : shown.map(([c, list]) => [c, nq ? list.filter((x) => normalizeAnswer(x.country.names.de).includes(nq)) : list] as const).filter(([, list]) => list.length)
  if (!total) return null
  return (
    <div className="mt-3" role="radiogroup" aria-label={t('setup.country_pick')}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-2">{t('setup.country_pick')}:</span>
        {total > 12 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={continent ? t('setup.country_filter') : t('setup.country_filter_world', { count: total })} aria-label={t('setup.country_filter')} className="min-h-9 flex-1 rounded-xl border border-line bg-card px-3 text-sm" />}
      </div>
      {filtered.map(([c, list]) => (
        <div key={c} className="mb-2">
          {shown.length > 1 && <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-ink-2">{t(`scope.${c}`)}</p>}
          <div className="flex flex-wrap gap-2">
            {list.map(({ country, n }) => (
              <button key={country.id} type="button" role="radio" aria-checked={country.id === value} aria-label={country.names.de} className={`chip inline-flex items-center gap-2 ${country.id === value ? 'chip-active' : ''}`} onClick={() => onChange(country.id === value ? '' : country.id)}>
                <Flag entity={country} size="xs" />
                {country.names.de} <span className="text-ink-2">{n}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {!filtered.length && !collapsed && <p className="text-sm text-ink-2">{t('setup.country_none')}</p>}
    </div>
  )
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 border-b border-line pb-8 last:border-b-0">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs text-white shadow-sm">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function CategoryHub() {
  const { t } = useTranslation()
  const geo = useGeoData()
  const { data: open } = useAsync(() => getRepository().getOpenSessions(), [])
  useDocumentTitle(t('nav.play'))
  return (
    <Page title={t('play.title')}>
      {open && open.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('play.open_runs')}</h2>
          <div className="grid gap-2">
            {open.slice(0, 2).map((s) => {
              const total = baseQuestionTotal(s)
              const position = baseQuestionPosition(s)
              return (
                <Link key={s.id} to={`/play/session/${encodeURIComponent(s.id)}`} className="card flex items-center gap-3 p-3 hover:bg-card-2">
                  <div className="min-w-0 flex-1">
                    <RoundTitle setup={setupOf(s)} progress={{ done: position, total }} />
                    <ProgressBar className="mt-2" value={position / total} />
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
        {PLAY_QUIZZES.map((c) => (
          <Link key={c.id} to={`/play/${c.id}`} className="card flex min-w-0 items-center gap-3 overflow-hidden p-3 hover:bg-card-2">
            <CategoryIconTile id={c.id} size="sm" />
            <span className="min-w-0 flex-1 break-words hyphens-auto text-sm font-medium leading-tight sm:text-base">{t(`category.${c.id}`)}</span>
            {c.countKey && geo.index?.counts[c.countKey] !== undefined && <span className="ml-auto hidden shrink-0 text-xs text-ink-2 sm:inline">{geo.index.counts[c.countKey]}</span>}
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
