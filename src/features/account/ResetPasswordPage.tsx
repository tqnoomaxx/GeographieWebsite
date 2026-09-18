import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDocumentTitle } from '@/app/hooks'
import { auth, authErrorMessage } from '@/services/auth'
import { Page, Card } from '@/ui'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('account.new_password'))
  const navigate = useNavigate()
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await auth.updatePassword(pw)
      navigate('/account')
    } catch (err) {
      setMsg(authErrorMessage(err))
    }
  }
  return (
    <Page title={t('account.new_password')} back="/login">
      <Card className="mx-auto max-w-md">
        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm">
            {t('account.password')}
            <input className="min-h-12 w-full rounded-xl border border-line bg-card px-3" type="password" minLength={8} required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          {msg && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm">{msg}</p>}
          <button className="btn-primary" type="submit">{t('common.save')}</button>
        </form>
      </Card>
    </Page>
  )
}
