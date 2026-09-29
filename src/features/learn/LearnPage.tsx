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
import { Page, Chips, Flag, formatNumber, entityPath, EmptyState } from '@/ui'
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
    <Page wide>
      <header className="learn-masthead">
        <div><span>STUDIENBLATT · 01</span><h1>{t('learn.title')}</h1></div>
        <p>Land für Land.<br /><strong>Die Welt bleibt hängen.</strong></p>
        <Link to="/learn/cards?collection=countries" className="btn-secondary">{t('setup.cards')} ↗</Link>
      </header>
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
        <div className="learn-workspace">
          <aside className="learn-scope-rail">
            <span className="atlas-label">01 · GEBIET</span>
            <Chips
              label={t('play.scope')}
              value={scope}
              onChange={(s) => {
                setScope(s)
                localStorage.setItem('gk.learn.scope', s)
              }}
              items={SCOPES.map((s) => ({ value: s as string, label: t(`scope.${s}`) }))}
            />
            <div className="learn-counter"><strong>{formatNumber(queue.length)}</strong><span>Länder<br />in dieser Route</span></div>
          </aside>
          <article className="learn-sheet">
            <header className="learn-sheet-head">
              <span>{String(idx + 1).padStart(2, '0')} / {String(queue.length).padStart(2, '0')}</span>
              <span>{t(`scope.${current.attributes.continent}`)} · {progressLabel(progress?.get(current.id)?.state, t)}</span>
            </header>
            <div className="learn-sheet-main">
              <div className="learn-country-identity">
                <div className="learn-flag-stage"><Flag entity={current} size="xl" /></div>
                <span className="atlas-label">LAND · {String(current.attributes.iso2 ?? '')}</span>
                <h2>{current.names.de}</h2>
              </div>
              <div className="learn-facts">
                <span className="atlas-label">02 · SCHLÜSSELDATEN</span>
                <FactGrid country={current as Country} compact />
              </div>
            </div>
            <footer className="learn-actions">
              <button className="btn-primary" onClick={mark}>✓ {t('learn.mark_learned')}</button>
              <button className="btn-secondary" onClick={() => setIdx((i) => i + 1)}>{t('learn.next')} →</button>
              <Link to={`/play/countries/round?mode=auto&scope=${encodeURIComponent(scope)}&len=5&only=${current.id}`} className="btn-secondary">🎯 {t('learn.quiz_me')}</Link>
              <Link to={entityPath(current)} className="learn-detail-link">Details öffnen ↗</Link>
            </footer>
          </article>
          <aside className="learn-note">
            <span>MERKSATZ</span>
            <p>Wissen wächst nicht in Listen, sondern durch Wiedersehen.</p>
          </aside>
        </div>
      )}
      <p className="learn-today">
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
