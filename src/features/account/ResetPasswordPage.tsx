import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/AuthProvider'
import { useDocumentTitle } from '@/app/hooks'
import { auth, authErrorMessage, isStrongPassword, passwordChecks, PASSWORD_MIN_LENGTH } from '@/services/auth'
import { Page, Card } from '@/ui'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('account.new_password'))
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [mfaChecked, setMfaChecked] = useState(false)

  useEffect(() => {
    if (!user) return
    void auth.mfaStatus().then((status) => {
      if (status.required) navigate('/mfa?next=/passwort', { replace: true })
      else setMfaChecked(true)
    }).catch((error) => setMessage(authErrorMessage(error)))
  }, [navigate, user])

  if (!loading && !user) return <Navigate to="/login" replace />

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password !== confirmation) return setMessage(t('account.password_mismatch'))
    if (!isStrongPassword(password)) return setMessage(t('account.password_rules_hint'))
    setBusy(true)
    setMessage(null)
    try {
      await auth.updatePassword(password)
      navigate('/account', { replace: true })
    } catch (error) {
      setMessage(authErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const checks = passwordChecks(password)
  const field = 'min-h-12 w-full rounded-xl border border-line bg-card px-3'
  return (
    <Page title={t('account.new_password')} back="/account">
      <Card className="mx-auto max-w-md">
        <p className="mb-4 text-sm text-ink-2">{t('account.password_change_hint')}</p>
        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm">
            {t('account.new_password')}
            <input className={field} type="password" minLength={PASSWORD_MIN_LENGTH} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            {t('account.password_confirm')}
            <input className={field} type="password" minLength={PASSWORD_MIN_LENGTH} required autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </label>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-2" aria-label={t('account.password_rules')}>
            {Object.entries(checks).map(([key, ok]) => <li key={key} className={ok ? 'text-ok' : ''}>{ok ? '✓' : '○'} {t(`account.password_${key}`)}</li>)}
          </ul>
          {message && <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm">{message}</p>}
          <button className="btn-primary" type="submit" disabled={busy || !mfaChecked || !isStrongPassword(password) || password !== confirmation}>{t('common.save')}</button>
        </form>
      </Card>
    </Page>
  )
}
