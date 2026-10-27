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
import { Page, Flag, formatNumber, entityPath, EmptyState, ErrorState, LoadingState } from '@/ui'
import { ReviewPanel } from './ReviewPanel'
import { FactGrid } from '@/features/explore/facts'

export default function LearnPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('learn.title'))
  const geo = useGeoData()
  const repo = getRepository()
  const [scope, setScope] = useState<string>(() => localStorage.getItem('gk.learn.scope') ?? 'europe')
  const { data: progress, loading, error, reload } = useAsync(() => repo.getAllEntityProgress(), [])
  const [seed, setSeed] = useState(0)
  const [learnedNow, setLearnedNow] = useState(0)

  const queue = useMemo(() => {
    if (!geo.ready || !progress) return []
    const pool = geo.countries.filter(
      (c) => (c as Country).attributes.independent !== false && inScope(c, scope, geo.byId),
    )
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

  const [marking, setMarking] = useState(false)
  const [markError, setMarkError] = useState(false)
  const mark = async () => {
    if (!current || marking) return
    setMarking(true)
    setMarkError(false)
    try {
      await applyLearned(repo, current.id)
      setLearnedNow((n) => n + 1)
      setIdx((i) => i + 1)
    } catch {
      setMarkError(true)
    } finally {
      setMarking(false)
    }
  }

  return (
    <Page wide>
      <header className="simple-page-heading simple-learning-heading">
        <div>
          <h1>Lernen</h1>
          <p>Länder Schritt für Schritt kennenlernen.</p>
        </div>
        <Link to="/learn/cards?collection=countries" className="btn-secondary">
          Lernkarten
        </Link>
      </header>
      <label className="simple-learn-scope">
        Wo möchtest du lernen?
        <select
          aria-label="Lernbereich"
          value={scope}
          onChange={(event) => {
            setScope(event.target.value)
            localStorage.setItem('gk.learn.scope', event.target.value)
          }}
        >
          {SCOPES.map((s) => (
            <option value={s} key={s}>
              {t(`scope.${s}`)}
            </option>
          ))}
        </select>
      </label>
      {markError && (
        <p role="alert" className="mb-3 text-bad">
          Lernstand konnte nicht gespeichert werden. Bitte erneut markieren.
        </p>
      )}
      {error ? (
        <ErrorState onRetry={reload} />
      ) : loading || !geo.ready ? (
        <LoadingState message="Lernkarten werden geladen …" />
      ) : !current ? (
        <EmptyState
          icon="✅"
          title={t('learn.all_done')}
          action={
            <button
              className="btn-primary"
              onClick={() => {
                setSeed((s) => s + 1)
                reload()
              }}
            >
              {t('learn.next')}
            </button>
          }
        />
      ) : (
        <article className="simple-learning-card">
          <header>
            <span>
              {idx + 1} von {queue.length}
            </span>
            <span>
              {t(`scope.${current.attributes.continent}`)} ·{' '}
              {t(`learn.states.${progress?.get(current.id)?.state ?? 'new'}`)}
            </span>
          </header>
          <div className="simple-learning-body">
            <div className="simple-learning-country">
              <Flag entity={current} size="lg" />
              <h2>{current.names.de}</h2>
              <Link to={entityPath(current)}>Land entdecken →</Link>
            </div>
            <FactGrid country={current as Country} compact />
          </div>
          <footer>
            <button className="btn-primary" disabled={marking} onClick={mark}>
              ✓ {t('learn.mark_learned')}
            </button>
            <button className="btn-secondary" disabled={marking} onClick={() => setIdx((i) => i + 1)}>
              {t('learn.next')} →
            </button>
            <Link
              to={`/play/countries/round?mode=auto&scope=${encodeURIComponent(scope)}&len=5&only=${current.id}`}
              className="btn-ghost"
            >
              Frage dazu
            </Link>
          </footer>
        </article>
      )}
      <p className="simple-learn-today">
        {t('learn.done_today')}: {learnedNow} · {formatNumber(queue.length)} Länder in diesem Bereich
      </p>
      <ReviewPanel refresh={learnedNow} />
    </Page>
  )
}
