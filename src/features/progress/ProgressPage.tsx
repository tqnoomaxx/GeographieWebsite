import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useDocumentTitle, useStats } from '@/app/hooks'
import { ACHIEVEMENTS } from '@/config/achievements'
import { QUESTS } from '@/config/quests'
import { QUIZZES } from '@/config/quizzes'
import { setupOf } from '@/engine/session'
import { RoundTitle } from '@/features/play/RoundLabel'
import { getRepository } from '@/services/progress'
import { metric } from '@/services/gamification'
import { Page, Card, ProgressBar, Stat, EmptyState, entityPath } from '@/ui'
import { CategoryIcon, Icons, TypeIcon } from '@/ui/icons'
import type { CategoryId } from '@/engine/types'

export default function ProgressPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('progress.title'))
  const geo = useGeoData()
  const repo = getRepository()
  const { stats, level } = useStats()
  const { data: progress } = useAsync(() => repo.getAllEntityProgress(), [])
  const { data: unlocked } = useAsync(() => repo.getAchievements(), [])
  const { data: quests } = useAsync(() => repo.getQuests(), [])
  const { data: favorites } = useAsync(() => repo.getFavorites(), [])
  const { data: recent } = useAsync(() => repo.getRecentSessions(8), [])
  if (!stats || !level || !progress) return null
  const known = (pred: (id: string) => boolean) => [...progress.values()].filter((p) => p.state !== 'new' && pred(p.entityId)).length
  const mastered = [...progress.values()].filter((p) => p.state === 'mastered').length
  const world = [
    { key: 'countries', icon: '🌍', total: geo.index?.counts.country ?? 0, known: known((id) => id.startsWith('country:')) },
    { key: 'regions', icon: '🧭', total: geo.index?.counts.region ?? 0, known: known((id) => id.startsWith('region:')) },
    { key: 'cities', icon: '🏙️', total: geo.index?.counts.city ?? 0, known: known((id) => id.startsWith('city:')) },
    { key: 'landmarks', icon: '🏛️', total: geo.index?.counts.landmark ?? 0, known: known((id) => id.startsWith('landmark:')) },
    { key: 'water', icon: '🌊', total: geo.index?.counts.water ?? 0, known: known((id) => id.startsWith('river:') || id.startsWith('lake:')) },
    { key: 'nature', icon: '🏔️', total: geo.index?.counts.mountain ?? 0, known: known((id) => id.startsWith('mountain:')) },
    { key: 'license_plates', icon: '🚗', total: geo.index?.counts.license_plate ?? 0, known: known((id) => id.startsWith('license_plate:')) },
  ].filter((w) => w.total > 0)
  const unlockedSet = new Map((unlocked ?? []).map((a) => [a.id, a.unlockedAt]))
  const questState = new Map((quests ?? []).map((q) => [q.id, q]))
  const acc = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0

  return (
    <Page title={t('progress.title')} action={<Link to="/profile" className="btn-ghost px-3" aria-label={t('nav.profile')}><Icons.profile className="h-5 w-5" /></Link>}>
      <Card className="mb-5">
        <div className="flex items-baseline justify-between">
          <p className="text-xl font-semibold">{t('progress.level', { level: level.level })}</p>
          <p className="text-sm tabular-nums text-ink-2">{t('progress.xp_of', { xp: stats.xp.toLocaleString('de-DE'), next: level.next.toLocaleString('de-DE') })}</p>
        </div>
        <ProgressBar value={level.progress} className="mt-2" label="XP" />
        {stats.streak.current > 0 && <p className="mt-3 inline-flex items-center gap-1.5 text-sm"><Icons.flame className="h-4 w-4 text-warn" /> {t('progress.streak_hint', { days: stats.streak.current })}</p>}
      </Card>

      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('progress.my_world')}</h2>
      <Card className="mb-5 grid gap-3">
        {world.map((w) => (
          <div key={w.key}>
            <div className="flex justify-between text-sm">
              <span className="inline-flex items-center gap-2"><CategoryIcon id={w.key as CategoryId} className="h-4 w-4 text-ink-2" /> {t(`category.${w.key}`)}</span>
              <span className="tabular-nums text-ink-2">{t('progress.known', { known: w.known, total: w.total })} · {Math.round((w.known / w.total) * 100)} %</span>
            </div>
            <ProgressBar value={w.known / w.total} className="mt-1" />
          </div>
        ))}
      </Card>

      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('progress.stats')}</h2>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat value={stats.answered.toLocaleString('de-DE')} label={t('progress.answered')} />
        <Stat value={stats.correct.toLocaleString('de-DE')} label={t('progress.correct')} />
        <Stat value={`${acc} %`} label={t('progress.accuracy')} />
      </div>
      <Card className="mb-5 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
        {QUIZZES.filter((c) => stats.byCategory[c.id]).map((c) => {
          const s = stats.byCategory[c.id]!
          return (
            <div key={c.id} className="flex justify-between rounded-lg bg-card-2 px-3 py-2">
              <span className="inline-flex items-center gap-2"><CategoryIcon id={c.id} className="h-4 w-4 text-ink-2" /> {t(`category.${c.id}`)}</span>
              <span className="tabular-nums">{Math.round((s.correct / Math.max(1, s.answered)) * 100)} %</span>
            </div>
          )
        })}
        <div className="flex justify-between rounded-lg bg-card-2 px-3 py-2"><span>⭐ Gemeistert</span><span className="tabular-nums">{mastered}</span></div>
        <div className="flex justify-between rounded-lg bg-card-2 px-3 py-2"><span>🧩 Rätsel</span><span className="tabular-nums">{stats.puzzlesSolved}</span></div>
      </Card>

      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('progress.quests')}</h2>
      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-medium">📜 {t('progress.short_quests')}</h3>
          <ul className="grid gap-2 text-sm">
            {QUESTS.filter((q) => q.kind === 'short').map((q) => {
              const s = questState.get(q.id)
              const done = !!s?.completedAt
              return (
                <li key={q.id} className={done ? 'text-ink-2 line-through' : ''}>
                  {done ? '☑' : '☐'} {t(`quests.${q.id}`)} <span className="tabular-nums text-ink-2">{s?.progress ?? 0}/{q.target} · +{q.reward_xp} XP</span>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card>
          <h3 className="mb-2 font-medium">🌍 {t('progress.long_quests')}</h3>
          <ul className="grid gap-3 text-sm">
            {QUESTS.filter((q) => q.kind === 'long').map((q) => {
              const s = questState.get(q.id)
              return (
                <li key={q.id}>
                  <div className="flex justify-between"><span>{t(`quests.${q.id}`)}</span><span className="tabular-nums text-ink-2">{s?.progress ?? 0} / {q.target}</span></div>
                  <ProgressBar value={(s?.progress ?? 0) / q.target} className="mt-1" />
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('progress.achievements')} · {unlockedSet.size} / {ACHIEVEMENTS.length}</h2>
      <ul className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const at = unlockedSet.get(a.id)
          const value = metric(a, stats, mastered)
          return (
            <li key={a.id} className={`card p-3 ${at ? '' : 'opacity-60'}`} title={at ? new Date(at).toLocaleDateString('de-DE') : t('progress.locked')}>
              <p className="font-medium">{a.icon} {t(`achievements.${a.id}.title`)}</p>
              <p className="text-xs text-ink-2">{t(`achievements.${a.id}.desc`)}</p>
              {!at && <ProgressBar value={Math.min(1, value / a.threshold)} className="mt-2" />}
            </li>
          )
        })}
      </ul>

      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('progress.favorites')}</h2>
      {favorites && favorites.length > 0 ? (
        <ul className="mb-5 flex flex-wrap gap-2">
          {favorites.map((id) => {
            const e = geo.byId.get(id)
            return (
              <li key={id}>
                <Link to={e ? entityPath(e) : '#'} className="chip gap-1.5"><TypeIcon type={id.split(':')[0]} /> {e?.names.de ?? id}</Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mb-5"><EmptyState icon="♡" title={t('progress.no_favorites')} hint={t('progress.no_favorites_hint')} action={<Link to="/explore" className="btn-primary">{t('nav.explore')}</Link>} /></div>
      )}

      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('progress.recent')}</h2>
      {recent && recent.length > 0 ? (
        <ul className="card divide-y divide-line text-sm">
          {recent.map((s) => {
            const answered = s.questions.filter((q) => q.given !== undefined)
            const correct = answered.filter((q) => q.correct).length
            return (
              <li key={s.id} className="flex items-center justify-between px-4 py-2">
                <RoundTitle setup={setupOf(s)} icon={false} />
                <span className="tabular-nums text-ink-2">{correct}/{answered.length} · {new Date(s.startedAt).toLocaleDateString('de-DE')}</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-2">{t('progress.no_sessions')}</p>
      )}
    </Page>
  )
}
