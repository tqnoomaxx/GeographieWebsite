import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import type { Question } from '@/engine/types'
import { buildIssueUrl } from '@/services/feedback'
import { improvementContext } from '@/services/improvements'
import { useDeveloperAccess } from '@/features/developer/useDeveloperAccess'
import { ImprovementForm } from '@/features/developer/ImprovementForm'
import '@/features/developer/developer.css'

export function ReportDialog({ question, onClose }: { question: Question; onClose: () => void }) {
  const { t } = useTranslation()
  const access = useDeveloperAccess()
  const location = useLocation()
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal()
  }, [])
  const [reason, setReason] = useState('wrong')
  const [sent, setSent] = useState(false)
  const reasons = ['wrong', 'image', 'typo', 'map', 'other', ...(access.allowed ? ['improvement'] : [])]
  const url = buildIssueUrl(
    'report',
    `[Frage] ${question.type} · ${question.entities.join(', ')}`,
    `Grund: ${t(`forms.reason_${reason}`)}\nFrage-ID: ${question.id}\nGenerator: ${question.metadata.generator}\nBereich: ${question.metadata.scope}`,
  )
  return (
    <dialog
      ref={dialog}
      className="dev-dialog"
      aria-labelledby="report-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div>
        <h2 id="report-title" className="mb-3 text-lg font-semibold">
          ⚠ {t('play.report')}
        </h2>
        {sent ? (
          <p>{t('forms.reported')}</p>
        ) : (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm text-ink-2">{t('forms.report_reason')}</legend>
            {reasons.map((r) => (
              <label key={r} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                />
                {r === 'improvement' ? 'Verbesserungsvorschlag · Entwickler' : t(`forms.reason_${r}`)}
              </label>
            ))}
          </fieldset>
        )}
        {reason === 'improvement' && access.allowed ? (
          <div className="mt-4">
            <ImprovementForm
              context={improvementContext(
                `${t(`category.${question.category}`)} · ${t(question.prompt.key, question.prompt.params)}`,
                location.pathname + location.search,
                question,
              )}
            />
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink-2">{t('forms.offline_note')}</p>
        )}
        <div className="mt-4 flex gap-2">
          {!sent && reason !== 'improvement' && (
            <a
              className="btn-primary flex-1"
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={() => setSent(true)}
            >
              {t('forms.open_issue')}
            </a>
          )}
          <button className="btn-secondary flex-1" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </dialog>
  )
}
