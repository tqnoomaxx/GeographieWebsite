import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync, useDocumentTitle, useStats } from '@/app/hooks'
import { getRepository } from '@/services/progress'
import { Page, Card } from '@/ui'
import { PUZZLES } from './puzzles'
import { Icons, IconTile, PUZZLE_ICONS } from '@/ui/icons'
import { todayKey } from '@/engine/rng'

export default function DailyHubPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('daily.title'))
  const { data: results } = useAsync(() => getRepository().getPuzzles(), [])
  const { stats } = useStats()
  const today = todayKey()
  return (
    <Page title={t('daily.title')} action={<IconTile icon={Icons.daily} tone="tone-violet" size="sm" />}>
      <p className="mb-4 text-sm text-ink-2">
        {t('daily.today')}: {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        {stats && stats.streak.current > 0 && <span className="ml-2 inline-flex items-center gap-1"><Icons.flame className="h-3.5 w-3.5" /> {t('progress.streak', { days: stats.streak.current })}</span>}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {PUZZLES.filter((p) => p.available).map((p) => {
          const r = results?.find((x) => x.key === `${p.id}:${today}`)
          return (
            <Link key={p.id} to={`/daily/${p.id}`} className="card flex items-center gap-4 p-4 hover:bg-card-2">
              <IconTile icon={PUZZLE_ICONS[p.id]} tone="tone-violet" />
              <div className="flex-1">
                <p className="font-semibold">{t(`daily.${p.id}`)}</p>
                <p className="text-sm text-ink-2">{t(`daily.${p.id}_desc`)}</p>
              </div>
              <span className={`text-sm font-medium ${r?.finishedAt ? (r.solved ? 'text-ok' : 'text-bad') : 'text-ink-2'}`}>
                {r?.finishedAt ? (r.solved ? `✓ ${r.guesses.length}/6` : '✕') : r?.guesses.length ? `${r.guesses.length}/6` : '→'}
              </span>
            </Link>
          )
        })}
      </div>
      <Card className="mt-6 text-sm text-ink-2">{t('daily.come_back')}</Card>
    </Page>
  )
}
