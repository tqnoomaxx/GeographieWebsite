import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { getRepository } from '@/services/progress'
import { Page, ErrorState, LoadingState } from '@/ui'
import { PUZZLES } from './puzzles'
import { Icons } from '@/ui/icons'
import { todayKey } from '@/engine/rng'
import { PUZZLE_ICONS } from '@/ui/icons'

export default function DailyHubPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('daily.title'))
  const { data: results, loading, error, reload } = useAsync(() => getRepository().getPuzzles(), [])
  const today = todayKey()
  const puzzles = PUZZLES.filter((p) => p.available)
  const todayResults = puzzles.map((p) => results?.find((result) => result.key === `${p.id}:${today}`))
  const solved = todayResults.filter((result) => result?.solved).length
  const nextOpen = todayResults.findIndex((result) => !result?.finishedAt)
  const dateLabel = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })

  return (
    <Page wide>
      <header className="simple-page-heading">
        <h1>Tägliche Rätsel</h1>
        <p>{dateLabel} · Jeden Tag sechs neue Herausforderungen.</p>
      </header>
      <section className="simple-daily-progress" aria-label={t('daily.progress_label')}>
        <strong>{solved} von 6 gelöst</strong>
        <span>Wähle ein Rätsel oder setze deine Tagesrunde fort.</span>
      </section>
      <div className="daily-next-action">
        {error ? (
          <ErrorState onRetry={reload} />
        ) : loading ? (
          <LoadingState message="Tagesfortschritt wird geladen …" />
        ) : nextOpen >= 0 ? (
          <Link className="btn-primary" to={`/daily/${puzzles[nextOpen].id}`}>
            Nächstes offenes Rätsel <Icons.arrow aria-hidden />
          </Link>
        ) : (
          <section className="card p-5" aria-labelledby="daily-summary-title">
            <h2 id="daily-summary-title" className="text-xl font-semibold">
              Deine Tagesauswertung
            </h2>
            <p className="mt-2">
              {puzzles.length} von {puzzles.length} Rätseln abgeschlossen · {solved} gelöst ·{' '}
              {puzzles.length - solved} ungelöst.
            </p>
            <p className="mt-1 text-sm text-ink-2">Morgen wartet eine neue Tagesroute.</p>
          </section>
        )}
      </div>
      <div className="simple-puzzle-list">
        {puzzles.map((puzzle, index) => {
          const result = todayResults[index]
          const status = result?.finishedAt
            ? result.solved
              ? `✓ ${result.guesses.length}/6`
              : `✕ ${t('daily.failed')}`
            : result?.guesses.length
              ? `${result.guesses.length}/6`
              : index === 0
                ? t('daily.play_puzzle')
                : t('daily.open_puzzle')
          return (
            <Link
              key={puzzle.id}
              to={`/daily/${puzzle.id}`}
              className={`simple-puzzle-link ${result?.solved ? 'is-solved' : result?.finishedAt ? 'is-failed' : ''}`}
            >
              <span className="topic-icon">
                {(() => {
                  const Icon = PUZZLE_ICONS[puzzle.id]
                  return <Icon aria-hidden />
                })()}
              </span>
              <span className="simple-puzzle-copy">
                <strong>{t(`daily.${puzzle.id}`)}</strong>
                <small>{t(`daily.${puzzle.id}_desc`)}</small>
              </span>
              <span className="simple-puzzle-status">
                {status}
                <Icons.arrow aria-hidden />
              </span>
            </Link>
          )
        })}
      </div>

      <div className="daily-return">
        <span aria-hidden />
        <p>{t('daily.come_back')}</p>
        <span aria-hidden />
      </div>
    </Page>
  )
}
