import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { auth, authErrorMessage, type MfaEnrollment, type MfaStatus } from '@/services/auth'
import { Card } from '@/ui'

interface Props {
  email?: string
  initialStatus: MfaStatus
  onMessage: (message: string) => void
  onSignedOut: () => void
}

export function AccountSecurity({ email, initialStatus, onMessage, onSignedOut }: Props) {
  const { t } = useTranslation()
  const [status, setStatus] = useState(initialStatus)
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = async () => setStatus(await auth.mfaStatus())

  const startEnrollment = async () => {
    setBusy(true)
    try {
      setEnrollment(await auth.enrollMfa())
      setCode('')
    } catch (error) {
      onMessage(authErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const verifyEnrollment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!enrollment) return
    setBusy(true)
    try {
      await auth.verifyMfa(enrollment.factorId, code)
      setEnrollment(null)
      setCode('')
      await reload()
      onMessage(t('account.mfa_enabled'))
    } catch (error) {
      onMessage(authErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const removeFactor = async (factorId: string) => {
    if (!confirm(t('account.mfa_remove_confirm'))) return
    setBusy(true)
    try {
      await auth.unenrollMfa(factorId)
      await reload()
      onMessage(t('account.mfa_removed'))
    } catch (error) {
      onMessage(authErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const cancelEnrollment = async () => {
    if (!enrollment) return
    setBusy(true)
    try {
      await auth.unenrollMfa(enrollment.factorId)
      setEnrollment(null)
      setCode('')
    } catch (error) {
      onMessage(authErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const sendPasswordReset = async () => {
    if (!email) return
    setBusy(true)
    try {
      await auth.resetPassword(email)
      onMessage(t('account.check_mail_generic'))
    } catch (error) {
      onMessage(authErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const signOutEverywhere = async () => {
    if (!confirm(t('account.logout_all_confirm'))) return
    setBusy(true)
    try {
      await auth.signOut(true)
      onSignedOut()
    } catch (error) {
      onMessage(authErrorMessage(error))
      setBusy(false)
    }
  }

  return (
    <>
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-ink-2">{t('account.security')}</h2>
      <Card className="mb-4 grid gap-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{t('account.mfa_title')}</p>
              <p className="text-xs text-ink-2">{status.factors.length ? t('account.mfa_on') : t('account.mfa_off')}</p>
            </div>
            {!enrollment && <button className="btn-secondary py-2" type="button" onClick={() => void startEnrollment()} disabled={busy}>{status.factors.length ? t('account.mfa_add') : t('account.mfa_enable')}</button>}
          </div>
          <p className="mt-2 text-sm text-ink-2">{t('account.mfa_hint')}</p>
          {status.factors.length > 0 && (
            <ul className="mt-3 grid gap-2">
              {status.factors.map((factor, index) => (
                <li key={factor.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
                  <span>{factor.friendly_name || `${t('account.mfa_device')} ${index + 1}`}<span className="block text-xs text-ink-2">{new Date(factor.created_at).toLocaleDateString('de-DE')}</span></span>
                  <button className="btn-ghost py-1 text-bad" type="button" onClick={() => void removeFactor(factor.id)} disabled={busy}>{t('common.remove')}</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {enrollment && (
          <form className="grid gap-3 rounded-2xl border border-line bg-canvas/40 p-4" onSubmit={verifyEnrollment}>
            <p className="font-medium">{t('account.mfa_scan')}</p>
            <img className="mx-auto h-48 w-48 rounded-xl bg-white p-2" src={enrollment.qrCode} alt={t('account.mfa_qr_alt')} />
            <details className="text-xs text-ink-2">
              <summary className="cursor-pointer">{t('account.mfa_manual')}</summary>
              <code className="mt-2 block break-all rounded-lg bg-card p-2 text-ink">{enrollment.secret}</code>
            </details>
            <label className="grid gap-1 text-sm">
              {t('account.mfa_code')}
              <input className="min-h-12 rounded-xl border border-line bg-card px-3 text-center text-xl tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            </label>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" type="submit" disabled={busy || code.length !== 6}>{t('account.mfa_enable')}</button>
              <button className="btn-secondary" type="button" onClick={() => void cancelEnrollment()} disabled={busy}>{t('common.cancel')}</button>
            </div>
          </form>
        )}

        <div className="grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
          <button className="btn-secondary" type="button" onClick={() => void sendPasswordReset()} disabled={busy}>{t('account.change_password')}</button>
          <button className="btn-secondary" type="button" onClick={() => void signOutEverywhere()} disabled={busy}>{t('account.logout_all')}</button>
        </div>
      </Card>
    </>
  )
}
