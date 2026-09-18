import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/AuthProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { auth, authErrorMessage, getSupabase } from '@/services/auth'
import { getLocalRepository, getRepository, isRemoteActive } from '@/services/progress'
import { SupabaseRepository } from '@/services/progress/supabaseRepository'
import { Page, Card, useToast, Stat } from '@/ui'
import { Icons } from '@/ui/icons'

export default function AccountPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('account.title'))
  const { user, loading, configured, refresh } = useAuth()
  const navigate = useNavigate()
  const { show, toast } = useToast()
  const [isPublic, setIsPublic] = useState(false)
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const { data: localStats } = useAsync(() => getLocalRepository().getStats(), [])
  const { data: remoteStats, reload } = useAsync(() => (isRemoteActive() ? getRepository().getStats() : Promise.resolve(undefined)), [user?.id])

  useEffect(() => {
    if (!user) return
    void getSupabase().then(async (c) => {
      const { data } = await c.from('profiles').select('username, is_public').eq('id', user.id).maybeSingle()
      if (data) {
        setIsPublic(!!data.is_public)
        setUsername(data.username ?? '')
      }
    })
  }, [user])

  if (!configured) {
    navigate('/login', { replace: true })
    return null
  }
  if (loading) return null
  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  const migrate = async () => {
    setBusy(true)
    try {
      const snapshot = await getLocalRepository().exportAll()
      const repo = getRepository()
      if (repo instanceof SupabaseRepository) {
        await repo.importAll(snapshot, 'merge')
        show(t('account.migrated', { xp: snapshot.stats.xp, achievements: snapshot.achievements.length, entities: snapshot.entities.length }))
        reload()
      }
    } catch (e) {
      show(authErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const savePublic = async (next: boolean) => {
    setIsPublic(next)
    const c = await getSupabase()
    const { error } = await c.from('profiles').update({ is_public: next, username: username || null }).eq('id', user.id)
    if (error) show(t('account.username_taken'))
    else show(t('profile.saved'))
  }
  const remove = async () => {
    if (!confirm(t('account.delete_confirm'))) return
    setBusy(true)
    try {
      await auth.deleteAccount()
      await refresh()
      navigate('/')
    } catch (e) {
      show(authErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page title={t('account.title')} back="/profile">
      <Card className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl tone-indigo"><Icons.profile className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{user.email}</p>
          <p className="text-xs text-ink-2">{user.emailConfirmed ? t('account.confirmed') : t('account.unconfirmed')} · {t('account.since', { date: new Date(user.createdAt).toLocaleDateString('de-DE') })}</p>
        </div>
        <button className="btn-secondary py-2" onClick={() => void auth.signOut().then(refresh).then(() => navigate('/'))}>{t('account.logout')}</button>
      </Card>

      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('account.sync')}</h2>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <Stat value={localStats?.xp.toLocaleString('de-DE') ?? '–'} label={t('account.local_xp')} />
        <Stat value={remoteStats?.xp.toLocaleString('de-DE') ?? '–'} label={t('account.cloud_xp')} />
      </div>
      <Card className="mb-4 grid gap-2">
        <p className="text-sm text-ink-2">{t('account.migrate_hint')}</p>
        <button className="btn-primary" onClick={migrate} disabled={busy || !localStats || localStats.answered === 0}>
          <Icons.share className="h-4 w-4" /> {t('account.migrate')}
        </button>
      </Card>

      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('account.public_profile')}</h2>
      <Card className="mb-4 grid gap-3">
        <label className="grid gap-1 text-sm">
          {t('profile.username')}
          <input className="min-h-12 w-full rounded-xl border border-line bg-card px-3" value={username} pattern="[A-Za-z0-9_]{3,24}" maxLength={24} onChange={(e) => setUsername(e.target.value)} placeholder="GeoMax" />
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5" checked={isPublic} onChange={(e) => void savePublic(e.target.checked)} />
          <span className="text-sm">{t('account.public_toggle')}</span>
        </label>
        {isPublic && username && (
          <Link to={`/u/${username}`} className="text-sm underline">/u/{username} →</Link>
        )}
        <button className="btn-secondary" onClick={() => void savePublic(isPublic)}>{t('common.save')}</button>
      </Card>

      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('settings.data')}</h2>
      <Card className="grid gap-2">
        <Link to="/settings" className="btn-secondary">{t('settings.export')}</Link>
        <button className="btn-ghost text-bad" onClick={remove} disabled={busy}>{t('account.delete')}</button>
        <p className="text-xs text-ink-2">{t('account.delete_hint')}</p>
      </Card>
      {toast}
    </Page>
  )
}
