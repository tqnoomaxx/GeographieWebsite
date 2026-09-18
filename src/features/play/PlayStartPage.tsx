import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { CATEGORIES, ROUND_LENGTHS } from '@/config/categories'
import { MODES } from '@/config/modes'
import { SCOPES } from '@/engine/scope'
import { poolFor } from '@/engine/session'
import type { CategoryId } from '@/engine/types'
import { getRepository } from '@/services/progress'
import { Page, Card, Chips, ProgressBar } from '@/ui'
import { CATEGORY_ICONS, CATEGORY_TONES, Icons, IconTile } from '@/ui/icons'

const REGION_CATEGORIES: CategoryId[] = ['regions', 'cities', 'maps', 'mixed', 'flags']
const PLATE_CATEGORIES: CategoryId[] = ['license_plates', 'mixed']

export default function PlayStartPage() {
  const { t } = useTranslation()
  const { category } = useParams<{ category?: CategoryId }>()
  const navigate = useNavigate()
  const geo = useGeoData()
  useDocumentTitle(category ? t(`category.${category}`) : t('nav.play'))
  const [scope, setScope] = useState<string>(() => localStorage.getItem('gk.scope') ?? 'world')
  const [length, setLength] = useState<number | 'all'>(() => {
    const v = localStorage.getItem(`gk.len.${category}`)
    return v === 'all' ? 'all' : v ? Number(v) : 10
  })
  const [mode, setMode] = useState<string>(() => localStorage.getItem(`gk.mode.${category}`) ?? 'auto')
  const modes = category ? MODES[category] ?? [] : []
  const generatorIds = mode === 'auto' ? undefined : modes.find((m) => m.id === mode)?.generators
  const { data: open } = useAsync(() => getRepository().getOpenSessions(), [])

  useEffect(() => {
    if (category && REGION_CATEGORIES.includes(category) && !geo.regionsLoaded) void geo.ensureRegions()
    if (category && PLATE_CATEGORIES.includes(category) && !geo.platesLoaded) void geo.ensurePlates()
  }, [category, geo])

  const poolSize = useMemo(() => {
    if (!category || !geo.ready) return 0
    return poolFor(category, geo.contextFor(scope), generatorIds).size
  }, [category, scope, geo, generatorIds])

  const countryScopes = useMemo(() => {
    // Länder mit Regionen als zusätzliche Bereiche (nur für Regionen/Karten/Gemischt)
    if (!category || !['regions', 'maps', 'mixed', 'cities', 'license_plates'].includes(category) || !geo.index) return []
    return Object.keys(geo.index.regions)
      .map((id) => geo.byId.get(id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .sort((a, b) => a.names.de.localeCompare(b.names.de))
  }, [category, geo])

  if (!category) {
    return (
      <Page title={t('play.title')}>
        {open && open.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('play.open_runs')}</h2>
            <div className="grid gap-2">
              {open.map((s) => {
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

  const def = CATEGORIES.find((c) => c.id === category)
  const start = () => {
    localStorage.setItem('gk.scope', scope)
    localStorage.setItem(`gk.len.${category}`, String(length))
    localStorage.setItem(`gk.mode.${category}`, mode)
    navigate(`/play/${category}/round?scope=${encodeURIComponent(scope)}&len=${length}${generatorIds ? `&gens=${generatorIds.join(',')}` : ''}`)
  }
  const lengths = [...ROUND_LENGTHS.filter((l) => l < poolSize).map((l) => ({ value: l as number | 'all', label: String(l) })), { value: 'all' as const, label: t('play.all', { count: poolSize }) }]

  return (
    <Page title={t(`category.${category}`)} back="/play" action={def && <IconTile icon={CATEGORY_ICONS[def.id]} tone={CATEGORY_TONES[def.id]} size="sm" />}>
      <Card className="grid gap-5">
        <div>
          <h2 className="mb-2 text-sm font-medium text-ink-2">{t('play.scope')}</h2>
          <Chips label={t('play.scope')} value={scope} onChange={setScope} items={SCOPES.map((s) => ({ value: s as string, label: t(`scope.${s}`) }))} />
          {countryScopes.length > 0 && (
            <div className="mt-2">
              <select className="w-full rounded-xl border border-line bg-card px-3 py-3" value={scope.startsWith('country:') ? scope : ''} onChange={(e) => e.target.value && setScope(e.target.value)} aria-label="Land">
                <option value="">🌍 {t('facts.country')} …</option>
                {countryScopes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.names.de} ({geo.index?.regions[c.id]?.count})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {modes.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-medium text-ink-2">{t('play.mode')}</h2>
            <Chips label={t('play.mode')} value={mode} onChange={setMode} items={[{ value: 'auto', label: t('modes.auto') }, ...modes.map((m) => ({ value: m.id, label: t(`modes.${m.id}`) }))]} />
          </div>
        )}
        <div>
          <h2 className="mb-2 text-sm font-medium text-ink-2">{t('play.length')}</h2>
          <Chips label={t('play.length')} value={length} onChange={setLength} items={lengths} />
        </div>
        {poolSize === 0 ? (
          <p className="text-sm text-ink-2">{geo.ready ? t('play.no_questions') : t('common.loading')}</p>
        ) : (
          <button className="btn-primary text-lg" onClick={start}>
            {t('play.start')}
          </button>
        )}
      </Card>
    </Page>
  )
}
