import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocumentTitle } from '@/app/hooks'
import { PLAY_QUIZZES } from '@/config/quizzes'
import { buildMailtoUrl, localFeedbackAdapter } from '@/services/feedback'
import { Page, Card } from '@/ui'
import { LEGAL } from '@/config/brand'

export default function FormsPage({ kind }: { kind: 'suggest' | 'contact' }) {
  const { t } = useTranslation()
  useDocumentTitle(kind === 'suggest' ? t('legal.suggest') : t('legal.contact'))
  const [form, setForm] = useState<Record<string, string>>({})
  const [url, setUrl] = useState<string | null>(null)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (kind === 'contact') {
      if (!LEGAL.email) return
      setUrl(buildMailtoUrl(LEGAL.email, form.subject ?? 'Kontakt über Atlasfunke', form.Nachricht ?? ''))
    } else {
      const res = await localFeedbackAdapter.send(kind, form)
      setUrl(res.url ?? null)
    }
  }
  const field = 'min-h-12 w-full rounded-xl border border-line bg-card px-3 py-2'
  return (
    <Page title={kind === 'suggest' ? `💡 ${t('legal.suggest')}` : `✉️ ${t('legal.contact')}`} back="/settings">
      {url ? (
        <Card className="text-center">
          <p className="text-lg font-medium">✓ {t('forms.thanks')}</p>
          <p className="mt-2 text-sm text-ink-2">{t('forms.offline_note')}</p>
          <a className="btn-primary mt-4" href={url} {...(kind === 'suggest' ? { target: '_blank', rel: 'noreferrer' } : {})}>{kind === 'contact' ? t('forms.open_email') : t('forms.open_issue')}</a>
        </Card>
      ) : (
        <Card>
          {kind === 'suggest' && <p className="mb-4 rounded-xl bg-warn-soft px-3 py-2 text-sm">GitHub-Issues können öffentlich sein. Bitte keine Namen, E-Mail-Adressen oder vertraulichen Angaben eintragen.</p>}
          {kind === 'contact' && !LEGAL.email && <p role="alert" className="mb-4 rounded-xl bg-warn-soft px-3 py-2 text-sm">Die Kontaktadresse fehlt noch in der Deployment-Konfiguration. Vor der Veröffentlichung muss <code>VITE_CONTACT_EMAIL</code> gesetzt werden.</p>}
          <form className="grid gap-3" onSubmit={submit}>
            {kind === 'suggest' ? (
              <>
                <label className="grid gap-1 text-sm">{t('forms.title')}<input required className={field} maxLength={120} onChange={set('title')} /></label>
                <label className="grid gap-1 text-sm">{t('forms.category')}
                  <select className={field} onChange={set('Kategorie')} defaultValue="">
                    <option value="">–</option>
                    {PLAY_QUIZZES.map((c) => <option key={c.id} value={t(`category.${c.id}`)}>{t(`category.${c.id}`)}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">{t('forms.description')}<textarea required rows={3} className={field} maxLength={2000} onChange={set('Beschreibung')} /></label>
                <label className="grid gap-1 text-sm">{t('forms.questions')}<textarea rows={4} className={field} maxLength={3000} onChange={set('Fragen')} /></label>
              </>
            ) : (
              <>
                <label className="grid gap-1 text-sm">{t('forms.subject')}<input required className={field} maxLength={120} onChange={set('subject')} /></label>
                <label className="grid gap-1 text-sm">{t('forms.message')}<textarea required rows={5} className={field} maxLength={4000} onChange={set('Nachricht')} /></label>
              </>
            )}
            <p className="text-xs text-ink-2">{t('forms.offline_note')}</p>
            <button className="btn-primary" type="submit" disabled={kind === 'contact' && !LEGAL.email}>{t('forms.prepare')}</button>
          </form>
        </Card>
      )}
    </Page>
  )
}
