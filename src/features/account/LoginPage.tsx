import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/AuthProvider'
import { useDocumentTitle } from '@/app/hooks'
import { auth, authErrorMessage, isStrongPassword, passwordChecks, PASSWORD_MIN_LENGTH } from '@/services/auth'
import { Page, Card, Chips } from '@/ui'
import { Icons } from '@/ui/icons'

type Tab = 'login' | 'register' | 'magic'

export default function LoginPage() {
  const { t } = useTranslation()
  const { configured, user, refresh } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [remember, setRemember] = useState(() => auth.remembersSession())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const title = tab === 'login' ? t('account.login') : tab === 'register' ? t('account.register') : t('account.magic')
  useDocumentTitle(title)

  useEffect(() => {
    if (!user) return
    void auth.mfaStatus().then((status) => navigate(status.required ? '/mfa' : '/account', { replace: true })).catch(() => navigate('/account', { replace: true }))
  }, [navigate, user])

  if (user) return null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      auth.setPersistence(remember)
      if (tab === 'login') {
        await auth.signIn(email, password)
        await refresh()
        const mfa = await auth.mfaStatus()
        navigate(mfa.required ? '/mfa' : '/account')
      } else if (tab === 'register') {
        if (!isStrongPassword(password)) throw new Error('password too weak')
        if (password !== passwordConfirm) {
          setMsg({ kind: 'err', text: t('account.password_mismatch') })
          return
        }
        const result = await auth.signUp(email, password)
        if (result.needsConfirmation) setMsg({ kind: 'ok', text: t('account.check_mail_generic') })
        else {
          await refresh()
          navigate('/account')
        }
      } else {
        await auth.signInWithMagicLink(email)
        setMsg({ kind: 'ok', text: t('account.check_mail_generic') })
      }
    } catch (error) {
      setMsg({ kind: 'err', text: authErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    if (!email) return setMsg({ kind: 'err', text: t('account.enter_mail') })
    setBusy(true)
    setMsg(null)
    try {
      await auth.resetPassword(email)
      setMsg({ kind: 'ok', text: t('account.check_mail_generic') })
    } catch (error) {
      setMsg({ kind: 'err', text: authErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  const field = 'min-h-12 w-full rounded-xl border border-line bg-card px-3'
  const checks = passwordChecks(password)

  return (
    <Page title={title} back="/profile">
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
          onChange={(next) => {
            setTab(next)
            setMsg(null)
          }}
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
              <input className={field} type="password" required minLength={tab === 'register' ? PASSWORD_MIN_LENGTH : 1} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          )}
          {tab === 'register' && (
            <>
              <label className="grid gap-1 text-sm">
                {t('account.password_confirm')}
                <input className={field} type="password" required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
              </label>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-2" aria-label={t('account.password_rules')}>
                {Object.entries(checks).map(([key, ok]) => <li key={key} className={ok ? 'text-ok' : ''}>{ok ? '✓' : '○'} {t(`account.password_${key}`)}</li>)}
              </ul>
            </>
          )}
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-5 w-5" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>{t('account.remember')}<span className="block text-xs text-ink-2">{t('account.remember_hint')}</span></span>
          </label>
          {msg && <p role="status" className={`rounded-xl px-3 py-2 text-sm ${msg.kind === 'ok' ? 'bg-ok-soft' : 'bg-bad-soft'}`}>{msg.text}</p>}
          <button className="btn-primary" type="submit" disabled={busy || !configured || (tab === 'register' && (!isStrongPassword(password) || password !== passwordConfirm))}>
            <Icons.profile className="h-4 w-4" /> {tab === 'login' ? t('account.login') : tab === 'register' ? t('account.register') : t('account.send_link')}
          </button>
          {tab === 'login' && <button type="button" className="text-sm text-ink-2 underline" onClick={() => void reset()} disabled={!configured || busy}>{t('account.forgot')}</button>}
        </form>
        <p className="mt-4 text-xs text-ink-2">{t('account.privacy_hint')} <Link className="underline" to="/datenschutz">{t('legal.privacy')}</Link></p>
      </Card>
    </Page>
  )
}
