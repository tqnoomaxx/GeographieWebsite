import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync, useDocumentTitle, useStats } from '@/app/hooks'
import { ACHIEVEMENTS } from '@/config/achievements'
import { getRepository } from '@/services/progress/localRepository'
import type { Profile } from '@/services/progress/types'
import { Page, Card, useToast } from '@/ui'

const AVATARS = ['🧭', '🌍', '🗺️', '🏔️', '🌊', '🏛️', '🦊', '🦉', '🐢', '🦜', '🚀', '⛵']
const COLORS = ['#1e2a5a', '#2f7d4f', '#c98a12', '#b83232', '#6b3fa0', '#0e7490']

export default function ProfilePage() {
  const { t } = useTranslation()
  useDocumentTitle(t('profile.title'))
  const repo = getRepository()
  const { stats, level } = useStats()
  const { data: saved } = useAsync(() => repo.getProfile(), [])
  const { data: unlocked } = useAsync(() => repo.getAchievements(), [])
  const [p, setP] = useState<Profile>({ username: '', avatar: '🧭', color: COLORS[0], featuredAchievements: [], createdAt: new Date().toISOString() })
  const { show, toast } = useToast()
  useEffect(() => {
    if (saved) setP(saved)
  }, [saved])
  const save = async () => {
    await repo.saveProfile(p)
    show(t('profile.saved'))
  }
  const toggleFeatured = (id: string) =>
    setP((x) => ({ ...x, featuredAchievements: x.featuredAchievements.includes(id) ? x.featuredAchievements.filter((a) => a !== id) : [...x.featuredAchievements, id].slice(-5) }))
  return (
    <Page title={`👤 ${t('profile.title')}`} action={<Link to="/settings" className="btn-ghost px-3" aria-label={t('nav.settings')}>⚙️</Link>}>
      <Card className="mb-5 flex flex-col items-center py-8 text-center" style={{ background: `linear-gradient(180deg, ${p.color}22, transparent)` }}>
        <div className="flex h-24 w-24 items-center justify-center rounded-full text-5xl" style={{ background: p.color + '33' }} aria-hidden>
          {p.avatar}
        </div>
        <p className="mt-3 text-2xl font-semibold">{p.username || t('profile.guest')}</p>
        {level && <p className="text-ink-2">{t('progress.level', { level: level.level })}{p.title && ` · ${p.title}`}</p>}
        <p className="mt-2 text-2xl">{p.featuredAchievements.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.icon).join(' ')}</p>
      </Card>
      <Card className="grid gap-4">
        <label className="grid gap-1 text-sm">
          {t('profile.username')}
          <input className="min-h-12 rounded-xl border border-line bg-card px-3" value={p.username} maxLength={24} onChange={(e) => setP({ ...p, username: e.target.value })} />
        </label>
        <label className="grid gap-1 text-sm">
          {t('profile.title_field')}
          <input className="min-h-12 rounded-xl border border-line bg-card px-3" value={p.title ?? ''} maxLength={32} onChange={(e) => setP({ ...p, title: e.target.value })} />
        </label>
        <fieldset>
          <legend className="mb-1 text-sm">{t('profile.avatar')}</legend>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button key={a} type="button" className={`chip text-xl ${p.avatar === a ? 'chip-active' : ''}`} aria-pressed={p.avatar === a} onClick={() => setP({ ...p, avatar: a })}>{a}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-sm">{t('profile.color')}</legend>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" aria-label={c} aria-pressed={p.color === c} className={`h-10 w-10 rounded-full border-2 ${p.color === c ? 'border-ink' : 'border-transparent'}`} style={{ background: c }} onClick={() => setP({ ...p, color: c })} />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-sm">{t('profile.featured')}</legend>
          <div className="flex flex-wrap gap-2">
            {(unlocked ?? []).map((u) => {
              const a = ACHIEVEMENTS.find((x) => x.id === u.id)!
              const on = p.featuredAchievements.includes(u.id)
              return (
                <button key={u.id} type="button" className={`chip ${on ? 'chip-active' : ''}`} aria-pressed={on} onClick={() => toggleFeatured(u.id)}>
                  {a.icon} {t(`achievements.${u.id}.title`)}
                </button>
              )
            })}
            {(unlocked ?? []).length === 0 && <p className="text-sm text-ink-2">{t('progress.locked')}</p>}
          </div>
        </fieldset>
        <button className="btn-primary" onClick={save}>{t('profile.save')}</button>
        <p className="text-xs text-ink-2">{t('profile.account_hint')}</p>
        {stats && <p className="text-xs text-ink-2">{stats.answered} {t('progress.answered')}</p>}
      </Card>
      {toast}
    </Page>
  )
}
