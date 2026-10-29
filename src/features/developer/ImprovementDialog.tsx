import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Improvement, ImprovementContext } from '@/services/improvements'
import { ImprovementForm } from './ImprovementForm'
import { useDeveloperAccess } from './useDeveloperAccess'
import './developer.css'

export function ImprovementDialog({
  context,
  item,
  onClose,
  onSaved,
}: {
  context: ImprovementContext
  item?: Improvement
  onClose: () => void
  onSaved?: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const access = useDeveloperAccess()
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className="dev-dialog"
      aria-labelledby="improvement-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <header>
        <h2 id="improvement-title">{item ? 'Verbesserung bearbeiten' : 'Verbesserung notieren'}</h2>
        <button type="button" aria-label="Schließen" className="btn-ghost" onClick={onClose}>
          <X aria-hidden />
        </button>
      </header>
      {access.loading ? (
        <p>Rechte werden geprüft …</p>
      ) : access.allowed ? (
        <ImprovementForm context={context} item={item} onSaved={onSaved} />
      ) : (
        <p role="alert">Entwicklerrechte erforderlich.</p>
      )}
    </dialog>
  )
}
