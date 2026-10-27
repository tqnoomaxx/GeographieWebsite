import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import {
  AUTO,
  MIN_POOL,
  ROUND_LENGTHS,
  autoModes,
  isCategory,
  quizFor,
  type Content,
  type QuizMode,
} from '@/config/quizzes'
import { SCOPES } from '@/engine/scope'
import { defaultRound, isCountryScope, roundPath, type RoundConfig } from '@/engine/round'
import { poolFor } from '@/engine/session'
import type { CategoryId, GeneratorContext } from '@/engine/types'
import type { Entity } from '@/domain/types'
import { getRepository } from '@/services/progress'
import { Page, Flag } from '@/ui'
import { normalizeAnswer } from '@/engine/normalize'
import { Icons } from '@/ui/icons'
import { ArrowRight, ChevronDown, ChevronLeft, CheckCircle2, Map as MapIcon } from 'lucide-react'
import { QuizCatalog, QUIZ_COPY, TopicIcon } from './QuizCatalog'
import { OpenRounds } from './OpenRounds'
import { FLAG_HINT_COUNTRY_COUNT } from './FlagImage'
const PlayMapSwitcher = lazy(() => import('./PlayMapSwitcher').then((m) => ({ default: m.PlayMapSwitcher })))
import { buildStationProgress } from './stationProgress'

const KEY = (category: CategoryId) => `gk.setup.${category}`

function loadSetup(
  category: CategoryId,
  requestedScope: string | null,
  requestedMode: string | null,
): RoundConfig {
  let setup = defaultRound(category)
  try {
    const raw = localStorage.getItem(KEY(category))
    setup = raw
      ? { ...defaultRound(category), ...(JSON.parse(raw) as Partial<RoundConfig>) }
      : defaultRound(category)
  } catch {
    setup = defaultRound(category)
  }
  const acceptsCountry = !!(
    quizFor(category).perCountry &&
    requestedScope &&
    /^country:[A-Z]{2}$/.test(requestedScope)
  )
  if (requestedScope && (acceptsCountry || SCOPES.includes(requestedScope as (typeof SCOPES)[number]))) {
    setup = { ...setup, scope: requestedScope }
  }
  if (requestedMode && quizFor(category).modes.some((mode) => mode.id === requestedMode)) {
    setup = { ...setup, mode: requestedMode }
  }
  return setup
}

export default function PlayStartPage() {
  const { category } = useParams<{ category?: string }>()
  const [searchParams] = useSearchParams()
  if (!category) return <CategoryHub />
  if (!isCategory(category)) return <Navigate to="/play" replace />
  if (category === 'maps') return <Navigate to="/play/countries" replace />
  if (category === 'regions') return <Navigate to="/play/flags" replace />
  if (category === 'images') return <Navigate to="/play/landmarks?mode=image_to_landmark" replace />
  const requestedScope = searchParams.get('scope')
  const requestedMode = searchParams.get('mode')
  return (
    <Setup
      key={`${category}:${requestedScope ?? ''}:${requestedMode ?? ''}`}
      category={category}
      requestedScope={requestedScope}
      requestedMode={requestedMode}
    />
  )
}

/**
 * Rundeneinstellung in drei Schritten – Bereich, Fragetyp, Rundenlänge – vollständig aus config/quizzes.ts abgeleitet.
 * Angeboten wird nur, was mindestens MIN_POOL Lernkarten hat (R12); ungültige gespeicherte Auswahl fällt still zurück.
 */
function Setup({
  category,
  requestedScope,
  requestedMode,
}: {
  category: CategoryId
  requestedScope: string | null
  requestedMode: string | null
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const geo = useGeoData()
  const quiz = quizFor(category)
  const hasGeographicScope = quiz.geographicScope !== false
  useDocumentTitle(t(`category.${category}`))
  const [setup, setSetup] = useState<RoundConfig>(() => loadSetup(category, requestedScope, requestedMode))
  const patch = (p: Partial<RoundConfig>) => setSetup((s) => ({ ...s, ...p }))
  const [advanced, setAdvanced] = useState(() => !!requestedMode || isCountryScope(setup.scope))

  const loading = !geo.ready

  // Kontexte je Bereich einmal pro Datenstand bauen
  const ctxCache = useMemo(() => new Map<string, GeneratorContext>(), [geo])
  const ctxFor = (scope: string) => {
    let c = ctxCache.get(scope)
    if (!c) ctxCache.set(scope, (c = geo.contextFor(scope)))
    return c
  }
  const count = (scope: string, mode = AUTO, content?: Content[]) =>
    geo.ready ? poolFor(ctxFor(scope), { category, mode, content }).size : 0

  // ---- Bereich: Welt, Kontinente und (perCountry) einzelne Länder mit genug Lernkarten
  const worldPool = useMemo(
    () =>
      geo.ready ? poolFor(ctxFor('world'), { category, mode: AUTO }) : new Map<string, { entity: Entity }>(),
    [geo.ready, category, ctxCache],
  ) // eslint-disable-line react-hooks/exhaustive-deps
  const continents = useMemo(
    () => SCOPES.filter((s) => s !== 'world' && count(s) >= MIN_POOL),
    [geo.ready, category, ctxCache],
  ) // eslint-disable-line react-hooks/exhaustive-deps
  const countries = useMemo(() => {
    if (!quiz.perCountry) return []
    const counts = new Map<string, number>()
    for (const { entity: e } of worldPool.values()) {
      if (quiz.content && e.type === 'country') continue // in einem Land zählen nur seine Regionen
      const ids =
        (e.attributes.countries as string[] | undefined) ??
        (e.attributes.country ? [e.attributes.country] : [])
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
    return [
      ...SCOPES.filter((s) => groups.has(s)),
      ...[...groups.keys()].filter((k) => !SCOPES.includes(k as (typeof SCOPES)[number])),
    ].map((k) => [k, groups.get(k)!] as const)
  }, [countries])
  const scopeValid =
    loading ||
    setup.scope === 'world' ||
    continents.includes(setup.scope as (typeof SCOPES)[number]) ||
    countries.some((c) => c.country.id === setup.scope)
  const scope = scopeValid ? setup.scope : 'world'
  /** Kontinent-Chip, der zum Bereich gehört; bei einem einzelnen Land dessen Kontinent. */
  const activeContinent = isCountryScope(scope)
    ? ((geo.byId.get(scope)?.attributes.continent as string | undefined) ?? 'world')
    : scope

  // ---- Inhalt: Länder / Regionen / Alles (nur Kategorien mit `content`; in einem Land immer dessen Regionen)
  const contentOptions = useMemo(() => {
    if (!quiz.content || isCountryScope(scope)) return []
    return ([['country'], ['region'], ['country', 'region']] as Content[][]).filter(
      (c) => count(scope, AUTO, c) >= MIN_POOL,
    )
  }, [quiz.content, scope, geo.ready, ctxCache]) // eslint-disable-line react-hooks/exhaustive-deps
  const key = (c: Content[]) => c.join('+')
  const content: Content[] | undefined = !quiz.content
    ? undefined
    : isCountryScope(scope)
      ? ['region']
      : (contentOptions.find((c) => key(c) === key(setup.content ?? [])) ?? contentOptions[0] ?? ['country'])

  // ---- Fragetyp: nur mit genug Lernkarten im gewählten Bereich
  const modes = useMemo(
    () =>
      quiz.modes.filter(
        (m) =>
          (!isCountryScope(scope) || m.allowCountryScope !== false) &&
          (!m.scopes || m.scopes.includes(scope)) &&
          count(scope, m.id, m.content ?? content) >= MIN_POOL,
      ),
    [quiz, scope, content, geo.ready, ctxCache], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const mode: QuizMode | undefined = modes.find((m) => m.id === setup.mode)
  const effectiveContent = mode?.content ?? content

  // ---- Rundenlänge
  const pool = useMemo(
    () =>
      geo.ready
        ? poolFor(ctxFor(scope), { category, mode: mode?.id ?? AUTO, content: effectiveContent })
        : new Map<string, { entity: Entity }>(),
    [category, scope, mode, effectiveContent, geo.ready, ctxCache],
  ) // eslint-disable-line react-hooks/exhaustive-deps
  const poolSize = pool.size
  const lengths = [
    ...ROUND_LENGTHS.filter((l) => l < poolSize).map((l) => ({
      value: l as number | 'all',
      label: String(l),
    })),
    { value: 'all' as const, label: 'Alle' },
  ]
  const length: number | 'all' =
    mode?.length ?? (lengths.some((l) => l.value === setup.length) ? setup.length : 'all')

  const round: RoundConfig = {
    category,
    mode: mode?.id ?? AUTO,
    scope,
    content: effectiveContent,
    length,
    repeat: setup.repeat,
    hideFlagHints: category === 'flags' && !!setup.hideFlagHints,
  }
  const start = () => {
    localStorage.setItem(
      KEY(category),
      JSON.stringify({
        ...round,
        content: content ?? setup.content,
        mode: setup.mode,
        length: mode?.length ? setup.length : length,
      }),
    )
    navigate(roundPath(round))
  }

  return (
    <Page wide>
      <div className="simple-setup">
        <Link to="/play" className="simple-back">
          <ChevronLeft aria-hidden /> Alle Themen
        </Link>
        <header className="simple-page-heading setup-page-heading">
          <TopicIcon id={category} />
          <div>
            <h1>{t(`category.${category}`)}</h1>
            <p>{QUIZ_COPY[category] ?? t('setup.intro')}</p>
          </div>
        </header>
        <div className="simple-setup-panel">
          {hasGeographicScope && (
            <section className="simple-setup-section">
              <h2>Wo möchtest du üben?</h2>
              <div className="simple-scope-grid" role="radiogroup" aria-label={t('play.scope')}>
                {['world', ...continents].map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={s === activeContinent}
                    aria-label={t(`scope.${s}`)}
                    className={s === activeContinent ? 'is-selected' : ''}
                    onClick={() => patch({ scope: s })}
                  >
                    <span className="simple-radio-dot" aria-hidden />
                    <span>{t(`scope.${s}`)}</span>
                  </button>
                ))}
              </div>
              {isCountryScope(scope) && (
                <p className="simple-selected-country">
                  Ausgewähltes Land: <strong>{geo.byId.get(scope)?.names.de}</strong>
                </p>
              )}
            </section>
          )}
          <section className="simple-setup-section">
            <h2>Wie viele Fragen?</h2>
            {mode?.length === 'all' ? (
              <p className="setup-note">{t('setup.europe_note', { count: poolSize })}</p>
            ) : (
              <SegmentedChoices
                label={t('play.length')}
                value={length}
                onChange={(v) => patch({ length: v })}
                items={lengths}
              />
            )}
            <p className="simple-round-summary">
              {length === 'all' ? `Alle ${poolSize} Fragen` : `${length} Fragen`}
              {hasGeographicScope &&
                ` · ${isCountryScope(scope) ? geo.byId.get(scope)?.names.de : t(`scope.${scope}`)}`}
            </p>
            <p className="simple-save-note">
              <CheckCircle2 aria-hidden /> Dein Fortschritt wird gespeichert.
            </p>
          </section>
        </div>
        <button
          type="button"
          className="btn-primary simple-start-button"
          onClick={start}
          disabled={loading || poolSize < MIN_POOL}
        >
          Quiz starten <ArrowRight aria-hidden />
        </button>
        <details
          className="simple-disclosure simple-advanced"
          open={advanced}
          onToggle={(e) => setAdvanced(e.currentTarget.open)}
        >
          <summary>
            <span>
              <strong>Weitere Einstellungen</strong>
              <small>Fragetyp, Länder & Wiederholungen</small>
            </span>
            <ChevronDown aria-hidden />
          </summary>
          <div className="simple-advanced-body">
            {countries.length > 0 && (
              <CountryPicker
                groups={countryGroups}
                continent={activeContinent === 'world' ? undefined : activeContinent}
                value={isCountryScope(scope) ? scope : ''}
                onChange={(id) => patch({ scope: id || activeContinent })}
              />
            )}
            {contentOptions.length > 1 && content && (
              <div className="simple-setting">
                <h2>{t('setup.content_label')}</h2>
                <SegmentedChoices
                  label={t('setup.content_label')}
                  value={key(content)}
                  onChange={(v) => patch({ content: v.split('+') as Content[] })}
                  items={contentOptions.map((c) => ({
                    value: key(c),
                    label: c.length === 2 ? t('setup.content.all') : t(`setup.content.${category}.${c[0]}`),
                  }))}
                />
              </div>
            )}
            {modes.length > 0 && (
              <div className="simple-setting">
                <h2>Wie möchtest du üben?</h2>
                <div className="setup-mode-grid" role="radiogroup" aria-label={t('setup.mode')}>
                  <ModeChoice
                    value={AUTO}
                    label={t('modes.auto')}
                    description={
                      autoModes(quiz).some((m) => m.form === 'choice')
                        ? t('setup.auto_desc')
                        : t('setup.auto_desc_all')
                    }
                    selected={!mode}
                    icon={Icons.sparkles}
                    onSelect={(value) => patch({ mode: value })}
                  />
                  {modes.map((item) => (
                    <ModeChoice
                      key={item.id}
                      value={item.id}
                      label={t(`modes.${item.id}`)}
                      description={t(`modes_desc.${item.id}`, { defaultValue: '' })}
                      selected={mode?.id === item.id}
                      icon={
                        item.form === 'map'
                          ? Icons.map
                          : item.form === 'input'
                            ? Icons.keyboard
                            : Icons.choices
                      }
                      onSelect={(value) => patch({ mode: value })}
                    />
                  ))}
                </div>
              </div>
            )}
            {category === 'flags' && (
              <label className="setup-repeat">
                <span>
                  <strong>{t('setup.hide_flag_hints')}</strong>
                  <small>{t('setup.hide_flag_hints_desc', { count: FLAG_HINT_COUNTRY_COUNT })}</small>
                </span>
                <input
                  type="checkbox"
                  checked={!!setup.hideFlagHints}
                  onChange={(e) => patch({ hideFlagHints: e.target.checked })}
                />
                <span className="setup-switch" aria-hidden />
              </label>
            )}
            {mode?.length !== 'all' && (
              <label className="setup-repeat">
                <span>
                  <strong>{t('setup.repeat')}</strong>
                  <small>{t('setup.repeat_desc')}</small>
                </span>
                <input
                  type="checkbox"
                  checked={setup.repeat}
                  onChange={(e) => patch({ repeat: e.target.checked })}
                />
                <span className="setup-switch" aria-hidden />
              </label>
            )}
            {category === 'cities' && mode?.id === 'cities_over_300k' && (
              <p className="simple-data-note">{t('setup.large_cities_note')}</p>
            )}
            {category === 'languages' && <p className="simple-data-note">{t('setup.script_note')}</p>}
            {category === 'trivia' && <p className="simple-data-note">{t('play.trivia_note')}</p>}
          </div>
        </details>
        {poolSize < MIN_POOL && !loading && <p role="status">{t('play.no_questions')}</p>}
        <p className="simple-current-mode">Fragetyp: {mode ? t(`modes.${mode.id}`) : t('modes.auto')}</p>
      </div>
    </Page>
  )
}

function ModeChoice({
  value,
  label,
  description,
  selected,
  recommended = false,
  icon: Icon,
  onSelect,
}: {
  value: string
  label: string
  description: string
  selected: boolean
  recommended?: boolean
  icon: typeof Icons.globe
  onSelect: (value: string) => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      className={`setup-mode-choice ${selected ? 'is-selected' : ''} ${recommended ? 'is-featured' : ''}`}
      onClick={() => onSelect(value)}
    >
      <span className="setup-radio" aria-hidden />
      <Icon className="setup-mode-icon" strokeWidth={1.6} aria-hidden />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <strong>{label}</strong>
          {recommended && <span className="setup-recommended">{t('setup.recommended')}</span>}
        </span>
        <small>{description}</small>
      </span>
    </button>
  )
}

function SegmentedChoices<T extends string | number>({
  items,
  value,
  onChange,
  label,
}: {
  items: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="setup-segments" role="radiogroup" aria-label={label}>
      {items.map((item) => (
        <button
          key={String(item.value)}
          type="button"
          role="radio"
          aria-checked={item.value === value}
          aria-label={item.label}
          className={item.value === value ? 'is-selected' : ''}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

type CountryGroup = readonly [string, Array<{ country: Entity; n: number }>]

/** Einzelnes Land als Bereich: Flaggen-Chips nach Kontinent, auf den gewählten Kontinent eingeschränkt, Suchfeld bei langen Listen. */
function CountryPicker({
  groups,
  continent,
  value,
  onChange,
}: {
  groups: readonly CountryGroup[]
  continent?: string
  value: string
  onChange: (id: string) => void
}) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const shown = groups.filter(([c]) => !continent || c === continent)
  const total = shown.reduce((n, [, list]) => n + list.length, 0)
  const nq = normalizeAnswer(q)
  // Lange Listen (Welt, kein Kontinent gewählt) bleiben eingeklappt, bis gesucht oder ein Kontinent gewählt wird.
  const collapsed = total > 12 && !continent && !nq
  const filtered = collapsed
    ? []
    : shown
        .map(
          ([c, list]) =>
            [c, nq ? list.filter((x) => normalizeAnswer(x.country.names.de).includes(nq)) : list] as const,
        )
        .filter(([, list]) => list.length)
  if (!total) return null
  return (
    <div className="setup-country-picker" role="radiogroup" aria-label={t('setup.country_pick')}>
      <div className="setup-country-head">
        <span>{t('setup.country_pick')}</span>
        {total > 12 && (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              continent ? t('setup.country_filter') : t('setup.country_filter_world', { count: total })
            }
            aria-label={t('setup.country_filter')}
          />
        )}
      </div>
      {filtered.map(([c, list]) => (
        <div key={c} className="mb-2">
          {shown.length > 1 && (
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-ink-2">
              {t(`scope.${c}`)}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {list.map(({ country, n }) => (
              <button
                key={country.id}
                type="button"
                role="radio"
                aria-checked={country.id === value}
                aria-label={country.names.de}
                className={`chip inline-flex items-center gap-2 ${country.id === value ? 'chip-active' : ''}`}
                onClick={() => onChange(country.id === value ? '' : country.id)}
              >
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

function CategoryHub() {
  useDocumentTitle('Quiz auswählen')
  const geo = useGeoData()
  const [params] = useSearchParams()
  const directMap = params.get('view') === 'diorama'
  const [showMap, setShowMap] = useState(directMap)
  const { data: stationProgress } = useAsync(async () => {
    if (!showMap && !directMap) return undefined
    const repo = getRepository()
    const [stats, puzzles] = await Promise.all([repo.getStats(), repo.getPuzzles()])
    return buildStationProgress(stats, puzzles)
  }, [showMap, directMap])
  const map = (
    <details className="simple-disclosure" open={showMap} onToggle={(e) => setShowMap(e.currentTarget.open)}>
      <summary>
        <span>
          <MapIcon aria-hidden /> Quizthemen auf der 3D-Karte ansehen
        </span>
        <ChevronDown aria-hidden />
      </summary>
      {showMap && (
        <Suspense fallback={<p role="status">Karte wird geladen …</p>}>
          <PlayMapSwitcher counts={geo.index?.counts} progress={stationProgress} />
        </Suspense>
      )}
    </details>
  )
  return (
    <Page wide>
      <header className="simple-page-heading">
        <h1>{directMap ? 'Deine Wissensinsel' : 'Quiz auswählen'}</h1>
        <p>
          {directMap
            ? 'Erkunde die Welt. Finde dein nächstes Quiz.'
            : 'Ein Thema, ein Kontinent – und los geht’s.'}
        </p>
      </header>
      <OpenRounds />
      {directMap && (
        <div className="diorama-direct-view">
          <Suspense fallback={<p role="status">Karte wird geladen …</p>}>
            <PlayMapSwitcher counts={geo.index?.counts} progress={stationProgress} />
          </Suspense>
        </div>
      )}
      <QuizCatalog />
      <section className="simple-quiz-extras">
        <Link to="/daily">
          <Icons.daily aria-hidden />
          <span>
            <strong>Lieber ein Tagesrätsel?</strong>
            <small>Jeden Tag sechs neue Herausforderungen.</small>
          </span>
          <ArrowRight aria-hidden />
        </Link>
        <Link to="/learn">
          <Icons.learn aria-hidden />
          <span>
            <strong>Erst einmal kennenlernen</strong>
            <small>Entdecke die Welt mit Lernkarten.</small>
          </span>
          <ArrowRight aria-hidden />
        </Link>
      </section>
      {!directMap && map}
    </Page>
  )
}
