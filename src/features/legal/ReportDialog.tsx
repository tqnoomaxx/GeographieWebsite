import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Question } from '@/engine/types'
import { buildIssueUrl } from '@/services/feedback'

export function ReportDialog({ question, onClose }: { question: Question; onClose: () => void }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('wrong')
  const [sent, setSent] = useState(false)
  const reasons = ['wrong', 'image', 'typo', 'map', 'other']
  const url = buildIssueUrl('report', `[Frage] ${question.type} · ${question.entities.join(', ')}`, `Grund: ${t(`forms.reason_${reason}`)}\nFrage-ID: ${question.id}\nGenerator: ${question.metadata.generator}\nBereich: ${question.metadata.scope}`)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center" role="dialog" aria-modal aria-labelledby="report-title" onClick={onClose}>
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h2 id="report-title" className="mb-3 text-lg font-semibold">⚠ {t('play.report')}</h2>
        {sent ? (
          <p>{t('forms.reported')}</p>
        ) : (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm text-ink-2">{t('forms.report_reason')}</legend>
            {reasons.map((r) => (
              <label key={r} className="flex items-center gap-2">
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                {t(`forms.reason_${r}`)}
              </label>
            ))}
          </fieldset>
        )}
        <p className="mt-3 text-xs text-ink-2">{t('forms.offline_note')}</p>
        <div className="mt-4 flex gap-2">
          {!sent && (
            <a className="btn-primary flex-1" href={url} target="_blank" rel="noreferrer" onClick={() => setSent(true)}>
              {t('forms.open_issue')}
            </a>
          )}
          <button className="btn-secondary flex-1" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
