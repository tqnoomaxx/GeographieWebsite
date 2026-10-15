import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync, useDocumentTitle, useStats } from '@/app/hooks'
import { getRepository } from '@/services/progress'
import { Page, ErrorState, LoadingState } from '@/ui'
import { PUZZLES } from './puzzles'
import { Icons } from '@/ui/icons'
import { todayKey } from '@/engine/rng'
import { PuzzleArt } from './PuzzleArt'

export default function DailyHubPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('daily.title'))
  const { data: results, loading, error, reload } = useAsync(() => getRepository().getPuzzles(), [])
  const { stats } = useStats()
  const today = todayKey()
  const puzzles = PUZZLES.filter((p) => p.available)
  const todayResults = puzzles.map((p) => results?.find((result) => result.key === `${p.id}:${today}`))
  const solved = todayResults.filter((result) => result?.solved).length
  const nextOpen = todayResults.findIndex((result) => !result?.finishedAt)
  const current = nextOpen
  const dateLabel = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

  return (
    <Page wide>
      <header className="daily-page-head">
        <div>
          <h1>{t('daily.title')}</h1>
          <p>{dateLabel}</p>
        </div>
        <p className="daily-page-note">{t('daily.page_note')}</p>
      </header>

      <section className="daily-overview" aria-label={t('daily.progress_label')}>
        <div className="daily-overview-stats">
          <div><Icons.flame aria-hidden /><strong>{stats?.streak.current ?? 0}</strong><span>{t('daily.streak_days')}</span></div>
          <div><Icons.daily aria-hidden /><strong>{solved}</strong><span>{t('daily.of_six_solved')}</span></div>
        </div>
        <ol className="daily-route" aria-label={t('daily.route_label')}>
          {puzzles.map((puzzle, index) => {
            const result = todayResults[index]
            const state = result?.solved ? 'is-solved' : result?.finishedAt ? 'is-failed' : index === current ? 'is-current' : ''
            return <li key={puzzle.id} className={state}><span>{String(index + 1).padStart(2, '0')}</span><small className="sr-only">{t(`daily.${puzzle.id}`)}</small></li>
          })}
        </ol>
        <span className="daily-compass" aria-hidden><Icons.explore /></span>
      </section>

      <div className="daily-next-action">
        {error ? <ErrorState onRetry={reload} /> : loading ? <LoadingState message="Tagesfortschritt wird geladen …" /> : nextOpen >= 0 ? <Link className="btn-primary" to={`/daily/${puzzles[nextOpen].id}`}>Nächstes offenes Rätsel <Icons.arrow aria-hidden /></Link> : <section className="card p-5" aria-labelledby="daily-summary-title"><h2 id="daily-summary-title" className="text-xl font-semibold">Deine Tagesauswertung</h2><p className="mt-2">{puzzles.length} von {puzzles.length} Rätseln abgeschlossen · {solved} gelöst · {puzzles.length - solved} ungelöst.</p><p className="mt-1 text-sm text-ink-2">Morgen wartet eine neue Tagesroute.</p></section>}
      </div>
      <div className="daily-itinerary">
        {puzzles.map((puzzle, index) => {
          const result = todayResults[index]
          const status = result?.finishedAt
            ? result.solved ? `✓ ${result.guesses.length}/6` : `✕ ${t('daily.failed')}`
            : result?.guesses.length ? `${result.guesses.length}/6` : index === 0 ? t('daily.play_puzzle') : t('daily.open_puzzle')
          return (
            <Link key={puzzle.id} to={`/daily/${puzzle.id}`} className={`daily-stop ${index === 0 ? 'daily-stop-featured' : ''} ${result?.solved ? 'is-solved' : result?.finishedAt ? 'is-failed' : ''}`}>
              <span className="daily-stop-number">{String(index + 1).padStart(2, '0')}</span>
              <PuzzleArt puzzle={puzzle.id} featured={index === 0} />
              <span className="daily-stop-copy">
                <strong>{t(`daily.${puzzle.id}`)}</strong>
                <small>{t(`daily.${puzzle.id}_desc`)}</small>
              </span>
              <span className="daily-stop-status">{status}<Icons.arrow aria-hidden /></span>
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
