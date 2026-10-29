import { useEffect, useRef, useState } from 'react'
import { NotebookPen, X } from 'lucide-react'
import { NotesPanel } from './NotesPanel'

export function QuizNotesButton({ context }: { context: string }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="quiz-notes-trigger"
        aria-label="Notizen"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <NotebookPen aria-hidden />
        <span>Notizen</span>
      </button>
      {open && (
        <NotesDialog
          context={context}
          onClose={() => {
            setOpen(false)
            requestAnimationFrame(() => trigger.current?.focus())
          }}
        />
      )}
    </>
  )
}
function NotesDialog({ context, onClose }: { context: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="learning-notes-dialog"
      role="dialog"
      aria-labelledby="learning-notes-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <header className="learning-notes-heading">
        <NotebookPen aria-hidden />
        <div>
          <h2 id="learning-notes-title">Meine Lernnotizen</h2>
          <p>Festhalten. Wiederholen. Besser werden.</p>
        </div>
        <button
          type="button"
          autoFocus
          className="notes-icon-button"
          aria-label="Notizen schließen"
          onClick={onClose}
        >
          <X aria-hidden />
        </button>
      </header>
      <NotesPanel context={context} />
    </dialog>
  )
}
