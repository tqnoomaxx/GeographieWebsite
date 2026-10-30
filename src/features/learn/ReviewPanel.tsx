import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDataResources, useGeoData } from '@/app/DataProvider'
import { resourcesForQuiz } from '@/app/dataRequirements'
import { useAsync } from '@/app/hooks'
import { PLAY_QUIZZES, isCategory } from '@/config/quizzes'
import { SCOPES } from '@/engine/scope'
import { dueIds } from '@/engine/repetition'
import { poolFor } from '@/engine/session'
import { defaultRound, roundPath } from '@/engine/round'
import type { CategoryId } from '@/engine/types'
import { useRepository } from '@/app/useRepository'
import { ErrorState, LoadingState } from '@/ui'

export function ReviewPanel({ refresh = 0 }: { refresh?: number }) {
  const { t } = useTranslation()
  const repo = useRepository()
  const geo = useGeoData()
  const [category, setCategory] = useState<CategoryId>('flags')
  const [scope, setScope] = useState('world')
  const quiz = PLAY_QUIZZES.find((quiz) => quiz.id === category)!
  const effectiveScope = quiz.geographicScope === false ? 'world' : scope
  // Der weltweite Kontext bleibt für Antwortalternativen erhalten; only begrenzt nur die Fragen.
  const setup = { ...defaultRound(category), scope: effectiveScope }
  const data = useDataResources(resourcesForQuiz(category, setup))
  const progress = useAsync(() => repo.getAllEntityProgress(), [refresh, repo])
  const due = useMemo(() => {
    if (data.loading || !progress.data) return []
    return dueIds(poolFor(geo.contextFor(effectiveScope), { category, mode: 'auto' }).keys(), progress.data)
  }, [data.loading, geo, effectiveScope, category, progress.data])
  const selected = due.slice(0, 10)
  return (
    <section className="review-panel card" aria-labelledby="review-title">
      <div className="review-heading">
        <div>
          <span className="atlas-label">DEIN LERNRHYTHMUS</span>
          <h2 id="review-title">Fällige Inhalte wiederholen</h2>
        </div>
        <strong className="review-count" aria-label={`${due.length} fällige Inhalte`}>
          {data.loading || progress.loading ? '…' : due.length}
        </strong>
      </div>
      <div className="review-controls">
        <label>
          Kategorie
          <select
            value={category}
            onChange={(e) => {
              if (isCategory(e.target.value)) setCategory(e.target.value)
            }}
          >
            {PLAY_QUIZZES.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {t(`category.${quiz.id}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Gebiet
          <select
            value={effectiveScope}
            disabled={quiz.geographicScope === false}
            onChange={(e) => setScope(e.target.value)}
          >
            {SCOPES.map((scope) => (
              <option key={scope} value={scope}>
                {t(`scope.${scope}`)}
              </option>
            ))}
          </select>
        </label>
        {!data.loading && !progress.loading && selected.length > 0 && (
          <Link
            className="btn-primary"
            to={roundPath({ ...setup, length: selected.length, only: selected, repeat: true })}
          >
            {selected.length} {selected.length === 1 ? 'Lernkarte' : 'Lernkarten'} wiederholen →
          </Link>
        )}
      </div>
      {data.error || progress.error ? (
        <ErrorState
          onRetry={() => {
            data.retry()
            progress.reload()
          }}
        />
      ) : data.loading || progress.loading ? (
        <LoadingState message="Fällige Lernkarten werden geladen …" />
      ) : (
        <p className="text-sm text-ink-2">
          {due.length
            ? `${selected.length} von ${due.length} fälligen Inhalten · Fehler werden wiederholt.`
            : 'Hier ist gerade nichts fällig. Wähle eine andere Kategorie oder lerne mit den Karten weiter.'}
        </p>
      )}
    </section>
  )
}
