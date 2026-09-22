import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/AuthProvider'
import { useDocumentTitle } from '@/app/hooks'
import { auth, authErrorMessage, safeNextPath, type MfaStatus } from '@/services/auth'
import { Card, Page } from '@/ui'

export default function MfaChallengePage() {
  const { t } = useTranslation()
  useDocumentTitle(t('account.mfa_verify'))
  const { user, loading, refresh } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))
  const [status, setStatus] = useState<MfaStatus | null>(null)
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    void auth.mfaStatus().then((value) => {
      setStatus(value)
      setFactorId(value.factors[0]?.id ?? '')
      if (!value.required) navigate(next, { replace: true })
    }).catch((error) => setMessage(authErrorMessage(error)))
  }, [navigate, next, user])

  if (!loading && !user) return <Navigate to="/login" replace />

  const verify = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!factorId) return
    setBusy(true)
    setMessage(null)
    try {
      await auth.verifyMfa(factorId, code.replace(/\s/g, ''))
      await refresh()
      navigate(next, { replace: true })
    } catch (error) {
      setMessage(authErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page title={t('account.mfa_verify')} back="/login">
      <Card className="mx-auto max-w-md">
        <p className="text-sm text-ink-2">{t('account.mfa_verify_hint')}</p>
        <form className="mt-4 grid gap-3" onSubmit={verify}>
          {status && status.factors.length > 1 && (
            <label className="grid gap-1 text-sm">
              {t('account.mfa_device')}
              <select className="min-h-12 rounded-xl border border-line bg-card px-3" value={factorId} onChange={(e) => setFactorId(e.target.value)}>
                {status.factors.map((factor, index) => <option key={factor.id} value={factor.id}>{factor.friendly_name || `${t('account.mfa_device')} ${index + 1}`}</option>)}
              </select>
            </label>
          )}
          <label className="grid gap-1 text-sm">
            {t('account.mfa_code')}
            <input className="min-h-12 rounded-xl border border-line bg-card px-3 text-center text-xl tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
          </label>
          {message && <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm">{message}</p>}
          <button className="btn-primary" type="submit" disabled={busy || code.length !== 6 || !factorId}>{t('account.mfa_continue')}</button>
        </form>
      </Card>
    </Page>
  )
}
