import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import type { Country, Entity } from '@/domain/types'
import { SCOPES, inScope } from '@/engine/scope'
import { createRng } from '@/engine/rng'
import { selectionWeight } from '@/engine/srs'
import { getRepository } from '@/services/progress'
import { applyLearned } from '@/services/gamification'
import { Page, Card, Chips, Flag, formatNumber, entityPath, EmptyState } from '@/ui'
import { FactGrid } from '@/features/explore/facts'

export default function LearnPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('learn.title'))
  const geo = useGeoData()
  const repo = getRepository()
  const [scope, setScope] = useState<string>(() => localStorage.getItem('gk.learn.scope') ?? 'europe')
  const { data: progress, reload } = useAsync(() => repo.getAllEntityProgress(), [])
  const [seed, setSeed] = useState(0)
  const [learnedNow, setLearnedNow] = useState(0)

  const queue = useMemo(() => {
    if (!geo.ready || !progress) return []
    const pool = geo.countries.filter((c) => (c as Country).attributes.independent !== false && inScope(c, scope, geo.byId))
    const rng = createRng(`learn:${scope}:${seed}`)
    return rng
      .shuffle(pool)
      .map((e) => ({ e, w: selectionWeight(progress.get(e.id)) }))
      .sort((a, b) => b.w - a.w)
      .map((x) => x.e)
  }, [geo.ready, geo.countries, geo.byId, progress, scope, seed])
  const [idx, setIdx] = useState(0)
  useEffect(() => setIdx(0), [scope, seed])
  const current: Entity | undefined = queue[idx]

  const mark = async () => {
    if (!current) return
    await applyLearned(repo, current.id)
    setLearnedNow((n) => n + 1)
    setIdx((i) => i + 1)
  }

  return (
    <Page title={t('learn.title')} action={<Link to="/learn/cards?collection=countries" className="btn-secondary py-2 text-sm">{t('setup.cards')}</Link>}>
      <div className="mb-4">
        <Chips
          label={t('play.scope')}
          value={scope}
          onChange={(s) => {
            setScope(s)
            localStorage.setItem('gk.learn.scope', s)
          }}
          items={SCOPES.map((s) => ({ value: s as string, label: t(`scope.${s}`) }))}
        />
      </div>
      {!current ? (
        <EmptyState
          icon="✅"
          title={t('learn.all_done')}
          action={
            <button className="btn-primary" onClick={() => { setSeed((s) => s + 1); reload() }}>
              {t('learn.next')}
            </button>
          }
        />
      ) : (
        <Card className="mx-auto max-w-xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <Flag entity={current} size="lg" />
            <h2 className="text-2xl font-semibold uppercase tracking-wide">{current.names.de}</h2>
            <p className="text-sm text-ink-2">
              {t(`scope.${current.attributes.continent}`)} · {progressLabel(progress?.get(current.id)?.state, t)}
            </p>
          </div>
          <div className="mt-5">
            <FactGrid country={current as Country} compact />
          </div>
          <div className="mt-6 grid gap-2">
            <button className="btn-primary" onClick={mark}>
              ✓ {t('learn.mark_learned')}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-secondary" onClick={() => setIdx((i) => i + 1)}>
                {t('learn.next')} →
              </button>
              <Link to={`/play/countries/round?mode=auto&scope=${encodeURIComponent(scope)}&len=5&only=${current.id}`} className="btn-secondary">
                🎯 {t('learn.quiz_me')}
              </Link>
            </div>
            <Link to={entityPath(current)} className="btn-ghost text-sm">
              {current.names.de} · {t('nav.explore')} →
            </Link>
          </div>
        </Card>
      )}
      <p className="mt-4 text-center text-sm text-ink-2">
        {t('learn.done_today')}: {learnedNow} · {formatNumber(queue.length)} {t('common.of')} {geo.countries.length}
      </p>
    </Page>
  )
}

function progressLabel(state: string | undefined, t: (k: string) => string) {
  const map: Record<string, string> = { new: '🆕 Neu', learning: '📖 Lernen', familiar: '👍 Vertraut', mastered: '⭐ Gemeistert' }
  void t
  return map[state ?? 'new']
}
