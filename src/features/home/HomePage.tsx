import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useStats, useDocumentTitle } from '@/app/hooks'
import { CATEGORIES } from '@/config/categories'
import { getRepository } from '@/services/progress'
import { Page, Card, ProgressBar } from '@/ui'
import { PUZZLES } from '@/features/daily/puzzles'
import { todayKey } from '@/engine/rng'

export default function HomePage() {
  const { t } = useTranslation()
  useDocumentTitle()
  const { index } = useGeoData()
  const { stats, level } = useStats()
  const { data: open } = useAsync(() => getRepository().getOpenSessions(), [])
  const { data: puzzles } = useAsync(() => getRepository().getPuzzles(), [])
  const isNew = !stats || stats.answered === 0
  const today = todayKey()
  const primary = CATEGORIES.filter((c) => c.primary)

  return (
    <Page>
      <section className="mb-6 text-center md:mb-10 md:text-left">
        <p className="text-sm font-medium uppercase tracking-wider text-ink-2">🧭 {t('app.name')}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-5xl">{isNew ? t('app.guest_hook') : t('app.tagline')}</h1>
        {isNew && (
          <Link to="/play/flags/round?len=10&scope=world" className="btn-primary mt-5 px-8 text-lg">
            {t('app.play_now')}
          </Link>
        )}
      </section>

      {open && open.length > 0 && (
        <Card className="mb-6 flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            ▶️
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {t('play.resume', {
                category: t(`category.${open[0].category}`),
                scope: open[0].scope.startsWith('country:') ? open[0].scope.slice(8) : t(`scope.${open[0].scope}`),
                done: open[0].position,
                total: open[0].questions.length + (open[0].remaining?.length ?? 0),
              })}
            </p>
            <ProgressBar className="mt-1" value={open[0].position / (open[0].questions.length + (open[0].remaining?.length ?? 0))} />
          </div>
          <Link to={`/play/session/${encodeURIComponent(open[0].id)}`} className="btn-primary">
            {t('app.continue')}
          </Link>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {primary.map((c) => (
          <Link key={c.id} to={`/play/${c.id}`} className="card flex flex-col gap-1 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="text-3xl" aria-hidden>
              {c.icon}
            </span>
            <span className="font-semibold">{t(`category.${c.id}`)}</span>
            {c.countKey && index?.counts[c.countKey] !== undefined && <span className="text-xs text-ink-2">{index.counts[c.countKey]}</span>}
          </Link>
        ))}
        <Link to="/learn" className="card flex flex-col gap-1 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="text-3xl" aria-hidden>
            📚
          </span>
          <span className="font-semibold">{t('nav.learn')}</span>
        </Link>
        <Link to="/play" className="card flex flex-col gap-1 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="text-3xl" aria-hidden>
            ➕
          </span>
          <span className="font-semibold">{t('nav.more')}</span>
        </Link>
      </section>

      <section className="mt-6">
        <Link to="/daily" className="card flex items-center gap-3 p-4 hover:bg-card-2">
          <span className="text-2xl" aria-hidden>
            🧩
          </span>
          <div className="flex-1">
            <p className="font-semibold">{t('daily.title')}</p>
            <p className="text-sm text-ink-2">
              {t('daily.today')}:{' '}
              {PUZZLES.filter((p) => p.available).map((p) => {
                const r = puzzles?.find((x) => x.key === `${p.id}:${today}`)
                return `${t(`daily.${p.id}`)}${r?.finishedAt ? (r.solved ? ' ✓' : ' ✕') : ''}`
              }).join(' · ')}
            </p>
          </div>
          <span aria-hidden>→</span>
        </Link>
      </section>

      {!isNew && stats && level && (
        <section className="mt-6 grid grid-cols-3 gap-3">
          <Card className="text-center">
            <div className="text-xl">🔥 {stats.streak.current}</div>
            <div className="text-xs text-ink-2">{t('progress.streak', { days: '' }).trim()}</div>
          </Card>
          <Card className="text-center">
            <div className="text-xl">⭐ {level.level}</div>
            <div className="text-xs text-ink-2">Level</div>
          </Card>
          <Card className="text-center">
            <div className="text-xl">🏆</div>
            <div className="text-xs text-ink-2">
              <Link to="/progress" className="underline">
                {t('progress.achievements')}
              </Link>
            </div>
          </Card>
        </section>
      )}
    </Page>
  )
}
