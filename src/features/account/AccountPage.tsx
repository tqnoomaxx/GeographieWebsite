import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/AuthProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { auth, authErrorMessage, getSupabase, type MfaStatus } from '@/services/auth'
import { getLocalRepository, getRepository, isRemoteActive } from '@/services/progress'
import { SupabaseRepository } from '@/services/progress/supabaseRepository'
import { Page, Card, useToast, Stat, Skeleton } from '@/ui'
import { Icons } from '@/ui/icons'
import { AccountSecurity } from './AccountSecurity'

function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function AccountPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('account.title'))
  const { user, loading, configured, refresh } = useAuth()
  const navigate = useNavigate()
  const { show, toast } = useToast()
  const [isPublic, setIsPublic] = useState(false)
  const [username, setUsername] = useState('')
  const [mfa, setMfa] = useState<MfaStatus | null>(null)
  const [securityLoading, setSecurityLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deletePhrase, setDeletePhrase] = useState('')
  const { data: localStats } = useAsync(() => getLocalRepository().getStats(), [])
  const { data: remoteStats, reload } = useAsync(() => (isRemoteActive() ? getRepository().getStats() : Promise.resolve(undefined)), [user?.id])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void Promise.all([
      auth.mfaStatus(),
      getSupabase().then((client) => client.from('profiles').select('username, is_public').eq('id', user.id).maybeSingle()),
    ]).then(([status, profile]) => {
      if (cancelled) return
      if (status.required) {
        navigate('/mfa?next=/account', { replace: true })
        return
      }
      setMfa(status)
      if (profile.error) show(t('common.error'))
      if (profile.data) {
        setIsPublic(!!profile.data.is_public)
        setUsername(profile.data.username ?? '')
      }
      setSecurityLoading(false)
    }).catch((error) => {
      if (!cancelled) {
        show(authErrorMessage(error))
        setSecurityLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [navigate, show, t, user])

  if (!configured) return <Navigate to="/login" replace />
  if (loading) return <Page title={t('account.title')} back="/profile"><Skeleton className="h-56" /></Page>
  if (!user) return <Navigate to="/login" replace />
  if (securityLoading) return <Page title={t('account.title')} back="/profile"><Skeleton className="h-56" /></Page>

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
    } catch (error) {
      show(authErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const savePublic = async (next = isPublic) => {
    const cleanName = username.trim()
    if (next && !/^[A-Za-z0-9_]{3,24}$/.test(cleanName)) return show(t('account.username_taken'))
    setBusy(true)
    try {
      const client = await getSupabase()
      const { error } = await client.from('profiles').update({ is_public: next, username: cleanName || null }).eq('id', user.id)
      if (error) throw error
      setIsPublic(next)
      setUsername(cleanName)
      show(t('profile.saved'))
    } catch {
      show(t('account.username_taken'))
    } finally {
      setBusy(false)
    }
  }

  const exportCloud = async () => {
    setBusy(true)
    try {
      const snapshot = await auth.exportAccount()
      downloadJson(snapshot, `atlasfunke-konto-${new Date().toISOString().slice(0, 10)}.json`)
      show(t('account.exported'))
    } catch (error) {
      show(authErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (deleteEmail.trim().toLowerCase() !== user.email?.toLowerCase() || deletePhrase !== t('account.delete_phrase')) return
    setBusy(true)
    try {
      await auth.deleteAccount(deleteEmail.trim())
      await refresh()
      navigate('/', { replace: true })
    } catch (error) {
      show(authErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const signedOut = async () => {
    await refresh()
    navigate('/', { replace: true })
  }

  return (
    <Page title={t('account.title')} back="/profile">
      <Card className="mb-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl tone-indigo"><Icons.profile className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{user.email}</p>
          <p className="text-xs text-ink-2">{user.emailConfirmed ? t('account.confirmed') : t('account.unconfirmed')} · {t('account.since', { date: new Date(user.createdAt).toLocaleDateString('de-DE') })}</p>
        </div>
        <button className="btn-secondary py-2" onClick={() => void auth.signOut().then(signedOut)} disabled={busy}>{t('account.logout')}</button>
      </Card>

      {mfa && <AccountSecurity email={user.email} initialStatus={mfa} onMessage={show} onSignedOut={() => void signedOut()} />}

      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('account.sync')}</h2>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <Stat value={localStats?.xp.toLocaleString('de-DE') ?? '–'} label={t('account.local_xp')} />
        <Stat value={remoteStats?.xp.toLocaleString('de-DE') ?? '–'} label={t('account.cloud_xp')} />
      </div>
      <Card className="mb-4 grid gap-2">
        <p className="text-sm text-ink-2">{t('account.migrate_hint')}</p>
        <button className="btn-primary" onClick={() => void migrate()} disabled={busy || !localStats || localStats.answered === 0}>
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
          <input type="checkbox" className="h-5 w-5" checked={isPublic} onChange={(e) => void savePublic(e.target.checked)} disabled={busy} />
          <span className="text-sm">{t('account.public_toggle')}</span>
        </label>
        {isPublic && username && <Link to={`/u/${username}`} className="text-sm underline">/u/{username} →</Link>}
        <button className="btn-secondary" onClick={() => void savePublic()} disabled={busy}>{t('common.save')}</button>
      </Card>

      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('settings.data')}</h2>
      <Card className="grid gap-3">
        <p className="text-sm text-ink-2">{t('account.export_hint')}</p>
        <button className="btn-secondary" onClick={() => void exportCloud()} disabled={busy}>{t('account.export_cloud')}</button>
        <Link to="/settings" className="btn-secondary">{t('account.local_data')}</Link>
        <div className="border-t border-line pt-3">
          {!deleteOpen ? (
            <button className="btn-ghost text-bad" onClick={() => setDeleteOpen(true)}>{t('account.delete')}</button>
          ) : (
            <div className="grid gap-3 rounded-2xl border border-bad/30 bg-bad-soft p-4">
              <p className="font-medium text-bad">{t('account.delete_warning')}</p>
              <p className="text-sm text-ink-2">{t('account.delete_hint')}</p>
              <label className="grid gap-1 text-sm">{t('forms.email')}<input className="min-h-12 rounded-xl border border-line bg-card px-3" type="email" autoComplete="email" value={deleteEmail} onChange={(e) => setDeleteEmail(e.target.value)} /></label>
              <label className="grid gap-1 text-sm">{t('account.delete_type', { phrase: t('account.delete_phrase') })}<input className="min-h-12 rounded-xl border border-line bg-card px-3" value={deletePhrase} onChange={(e) => setDeletePhrase(e.target.value)} /></label>
              <div className="flex gap-2">
                <button className="btn-ghost flex-1 text-bad" onClick={() => void remove()} disabled={busy || deleteEmail.trim().toLowerCase() !== user.email?.toLowerCase() || deletePhrase !== t('account.delete_phrase')}>{t('account.delete_final')}</button>
                <button className="btn-secondary" onClick={() => setDeleteOpen(false)} disabled={busy}>{t('common.cancel')}</button>
              </div>
            </div>
          )}
        </div>
      </Card>
      {toast}
    </Page>
  )
}
