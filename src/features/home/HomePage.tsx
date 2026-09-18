import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useStats, useDocumentTitle } from '@/app/hooks'
import { CATEGORIES } from '@/config/categories'
import { getRepository } from '@/services/progress'
import { Page, Card, ProgressBar } from '@/ui'
import { CATEGORY_ICONS, CATEGORY_TONES, Icons, IconTile, PUZZLE_ICONS } from '@/ui/icons'
import { WorldMap } from '@/ui/maps'
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
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-accent px-6 py-10 text-accent-ink md:px-10 md:py-14">
        <div className="hero-map pointer-events-none absolute inset-0 opacity-25" aria-hidden>
          <div className="absolute -right-10 -top-6 w-[130%] md:w-[80%] md:-right-20">
            <WorldMap />
          </div>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-widest opacity-80">
            <Icons.explore className="h-4 w-4" /> {t('app.name')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{isNew ? t('app.guest_hook') : t('app.tagline')}</h1>
          {isNew ? (
            <Link to="/play/flags/round?len=10&scope=world" className="btn mt-6 bg-bg px-7 text-lg text-ink hover:opacity-90">
              <Icons.start className="h-5 w-5" /> {t('app.play_now')}
            </Link>
          ) : (
            stats && level && (
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"><Icons.flame className="h-4 w-4" /> {stats.streak.current} {t('progress.streak', { days: '' }).trim()}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"><Icons.star className="h-4 w-4" /> Level {level.level}</span>
                <Link to="/progress" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 hover:bg-white/25"><Icons.award className="h-4 w-4" /> {t('progress.achievements')}</Link>
              </div>
            )
          )}
        </div>
      </section>

      {open && open.length > 0 && (
        <Card className="mb-6 flex items-center gap-3">
          <IconTile icon={Icons.start} tone="tone-green" size="sm" />
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
          <Link to={`/play/session/${encodeURIComponent(open[0].id)}`} className="btn-primary">{t('app.continue')}</Link>
        </Card>
      )}

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-ink-2">{t('play.title')}</h2>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {primary.map((c) => (
          <Link key={c.id} to={`/play/${c.id}`} className="card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5">
            <IconTile icon={CATEGORY_ICONS[c.id]} tone={CATEGORY_TONES[c.id]} />
            <div>
              <span className="block font-semibold">{t(`category.${c.id}`)}</span>
              {c.countKey && index?.counts[c.countKey] !== undefined && <span className="text-xs text-ink-2">{index.counts[c.countKey].toLocaleString('de-DE')}</span>}
            </div>
          </Link>
        ))}
        <Link to="/learn" className="card flex flex-col gap-3 p-4 transition hover:-translate-y-0.5">
          <IconTile icon={Icons.learn} tone="tone-teal" />
          <span className="font-semibold">{t('nav.learn')}</span>
        </Link>
        <Link to="/play" className="card flex flex-col gap-3 p-4 transition hover:-translate-y-0.5">
          <IconTile icon={Icons.layers} tone="tone-slate" />
          <span className="font-semibold">{t('nav.more')}</span>
        </Link>
      </section>

      <section className="mt-6">
        <Link to="/daily" className="card flex items-center gap-4 p-4 hover:bg-card-2">
          <IconTile icon={Icons.daily} tone="tone-violet" />
          <div className="flex-1">
            <p className="font-semibold">{t('daily.title')}</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-2">
              {PUZZLES.filter((p) => p.available).map((p) => {
                const r = puzzles?.find((x) => x.key === `${p.id}:${today}`)
                const I = PUZZLE_ICONS[p.id]
                return (
                  <span key={p.id} className="inline-flex items-center gap-1">
                    <I className="h-3.5 w-3.5" aria-hidden /> {t(`daily.${p.id}`)}
                    {r?.finishedAt && (r.solved ? <Icons.check className="h-3.5 w-3.5 text-ok" /> : <Icons.x className="h-3.5 w-3.5 text-bad" />)}
                  </span>
                )
              })}
            </p>
          </div>
          <Icons.arrow className="h-5 w-5 text-ink-2" aria-hidden />
        </Link>
      </section>
    </Page>
  )
}
