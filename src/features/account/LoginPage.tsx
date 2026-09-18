import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/AuthProvider'
import { useDocumentTitle } from '@/app/hooks'
import { auth, authErrorMessage } from '@/services/auth'
import { Page, Card, Chips } from '@/ui'
import { Icons } from '@/ui/icons'

type Tab = 'login' | 'register' | 'magic'

export default function LoginPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('account.login'))
  const { configured, user, refresh } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  if (user) {
    navigate('/account', { replace: true })
    return null
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (tab === 'login') {
        await auth.signIn(email, password)
        await refresh()
        navigate('/account')
      } else if (tab === 'register') {
        const r = await auth.signUp(email, password)
        if (r.needsConfirmation) setMsg({ kind: 'ok', text: t('account.check_mail') })
        else {
          await refresh()
          navigate('/account')
        }
      } else {
        await auth.signInWithMagicLink(email)
        setMsg({ kind: 'ok', text: t('account.check_mail') })
      }
    } catch (err) {
      setMsg({ kind: 'err', text: authErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }
  const reset = async () => {
    if (!email) return setMsg({ kind: 'err', text: t('account.enter_mail') })
    try {
      await auth.resetPassword(email)
      setMsg({ kind: 'ok', text: t('account.check_mail') })
    } catch (err) {
      setMsg({ kind: 'err', text: authErrorMessage(err) })
    }
  }
  const field = 'min-h-12 w-full rounded-xl border border-line bg-card px-3'

  return (
    <Page title={t('account.login')} back="/profile">
      {!configured && (
        <Card className="mb-4 bg-warn-soft text-sm">
          <p className="font-medium">{t('account.not_configured')}</p>
          <p className="mt-1 text-ink-2">{t('account.not_configured_hint')}</p>
        </Card>
      )}
      <Card className="mx-auto max-w-md">
        <Chips
          label={t('account.mode')}
          value={tab}
          onChange={setTab}
          items={[
            { value: 'login', label: t('account.login') },
            { value: 'register', label: t('account.register') },
            { value: 'magic', label: t('account.magic') },
          ]}
        />
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm">
            {t('forms.email')}
            <input className={field} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {tab !== 'magic' && (
            <label className="grid gap-1 text-sm">
              {t('account.password')}
              <input className={field} type="password" required minLength={8} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          )}
          {msg && (
            <p role="status" className={`rounded-xl px-3 py-2 text-sm ${msg.kind === 'ok' ? 'bg-ok-soft' : 'bg-bad-soft'}`}>
              {msg.text}
            </p>
          )}
          <button className="btn-primary" type="submit" disabled={busy || !configured}>
            <Icons.profile className="h-4 w-4" /> {tab === 'login' ? t('account.login') : tab === 'register' ? t('account.register') : t('account.send_link')}
          </button>
          {tab === 'login' && (
            <button type="button" className="text-sm text-ink-2 underline" onClick={reset} disabled={!configured}>
              {t('account.forgot')}
            </button>
          )}
        </form>
        <p className="mt-4 text-xs text-ink-2">{t('account.privacy_hint')} <Link className="underline" to="/datenschutz">{t('legal.privacy')}</Link></p>
      </Card>
    </Page>
  )
}
