import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, LockKeyhole, RotateCcw, X } from 'lucide-react'
import { STORY_CHAPTERS } from './chapters'
import type { StoryProgress } from './storyProgress'

export function StoryJournal({
  progress,
  onClose,
  onReset,
}: {
  progress: StoryProgress
  onClose: () => void
  onReset: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const collected = STORY_CHAPTERS.filter((chapter) => progress.chapters[chapter.id]?.collected).length
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="story-journal"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      aria-labelledby="story-journal-title"
    >
      <div className="story-journal-inner">
        <header>
          <BookOpen aria-hidden />
          <div>
            <h2 id="story-journal-title">Dein Reisetagebuch</h2>
            <p>{collected} von 8 Fundstücken · Der Atlas der Winde</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Reisetagebuch schließen">
            <X aria-hidden />
          </button>
        </header>
        <ol>
          {STORY_CHAPTERS.map((chapter, index) => {
            const found = progress.chapters[chapter.id]?.collected
            return (
              <li key={chapter.id} className={found ? 'is-found' : ''}>
                <span className="story-journal-index" aria-hidden>
                  {found ? <Check /> : <LockKeyhole />}
                </span>
                <div>
                  <small>
                    Kapitel {index + 1} · {chapter.place}
                  </small>
                  <h3>{found ? chapter.artifact : 'Ein Fundstück wartet auf dich'}</h3>
                  <p>{found ? chapter.artifactDescription : chapter.title}</p>
                </div>
              </li>
            )
          })}
        </ol>
        <footer>
          {confirmReset ? (
            <div className="story-reset-confirm">
              <p>Die gesamte Reise und alle Fundstücke auf diesem Gerät zurücksetzen?</p>
              <button
                type="button"
                className="story-reset-button"
                onClick={() => {
                  onReset()
                  onClose()
                }}
              >
                Ja, neu beginnen
              </button>
              <button type="button" onClick={() => setConfirmReset(false)}>
                Abbrechen
              </button>
            </div>
          ) : (
            <button type="button" className="story-reset-button" onClick={() => setConfirmReset(true)}>
              <RotateCcw aria-hidden />
              Reise neu beginnen
            </button>
          )}
        </footer>
      </div>
    </dialog>
  )
}
