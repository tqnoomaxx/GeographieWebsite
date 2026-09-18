import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { authConfigured, getSupabase } from '@/services/auth'
import { levelForXp } from '@/config/levels'
import { ACHIEVEMENTS } from '@/config/achievements'
import { Page, Card, EmptyState, Skeleton } from '@/ui'

/** Öffentliches Profil über die View public_profiles (nur freigegebene Spalten, nur wenn is_public). */
export default function PublicProfilePage() {
  const { t } = useTranslation()
  const { username } = useParams()
  useDocumentTitle(username)
  const { data, loading } = useAsync(async () => {
    if (!authConfigured) return null
    const c = await getSupabase()
    const { data } = await c.from('public_profiles').select('*').eq('username', username).maybeSingle()
    return data as { username: string; avatar: string; color: string; title?: string; featured_achievements: string[]; xp: number } | null
  }, [username])
  if (loading) return <Page><Skeleton className="h-48" /></Page>
  if (!data) return <Page back="/"><EmptyState title={t('account.profile_not_found')} /></Page>
  const level = levelForXp(data.xp)
  return (
    <Page back="/">
      <Card className="mx-auto max-w-md flex flex-col items-center py-10 text-center" style={{ background: `linear-gradient(180deg, ${data.color}22, transparent)` }}>
        <div className="flex h-24 w-24 items-center justify-center rounded-full text-5xl" style={{ background: data.color + '33' }} aria-hidden>{data.avatar}</div>
        <p className="mt-3 text-2xl font-semibold">{data.username}</p>
        <p className="text-ink-2">{t('progress.level', { level: level.level })}{data.title && ` · ${data.title}`}</p>
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {data.featured_achievements.map((id) => {
            const a = ACHIEVEMENTS.find((x) => x.id === id)
            return a ? <li key={id} className="chip">{a.icon} {t(`achievements.${id}.title`)}</li> : null
          })}
        </ul>
      </Card>
    </Page>
  )
}
