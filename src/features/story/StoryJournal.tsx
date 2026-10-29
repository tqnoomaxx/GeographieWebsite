import { useEffect, useRef, useState } from 'react'
import { BookOpen, LockKeyhole, RotateCcw, X } from 'lucide-react'
import { STORY_LEVELS, levelAsset } from './levels'
import { earnedStars, type StoryProgress } from './levelProgress'
import { StoryStars } from './StoryStars'

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
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal()
  }, [])
  const cleared = STORY_LEVELS.filter((level) => progress.levels[level.id]?.stars).length
  return (
    <dialog
      ref={dialog}
      className="story-journal"
      aria-labelledby="story-journal-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="story-journal-inner">
        <header>
          <BookOpen aria-hidden />
          <div>
            <h2 id="story-journal-title">Dein Reisetagebuch</h2>
            <p>
              {cleared} / 8 Level · {earnedStars(progress)} / 24 Sterne
            </p>
          </div>
          <button type="button" aria-label="Reisetagebuch schließen" onClick={onClose}>
            <X aria-hidden />
          </button>
        </header>
        <p className="story-star-guide">
          Drei Sterne: ohne Fehler und Hinweise. Zwei Sterne: höchstens ein Fehler und ein Hinweis. Jedes
          abgeschlossene Level öffnet die nächste Welt.
        </p>
        <ol>
          {STORY_LEVELS.map((level, index) => {
            const stars = progress.levels[level.id]?.stars ?? 0
            return (
              <li key={level.id} className={stars ? 'is-found' : ''}>
                <img src={levelAsset(level)} alt="" loading="lazy" />
                <div>
                  <small>
                    Level {index + 1} · {level.place}
                  </small>
                  <h3>{stars ? level.artifact : 'Ein Fundstück wartet auf dich'}</h3>
                  <p>{stars ? level.artifactDescription : level.mechanics}</p>
                  <StoryStars count={stars} />
                  {!stars && <LockKeyhole className="story-journal-lock" aria-label="Noch nicht gefunden" />}
                </div>
              </li>
            )
          })}
        </ol>
        <footer>
          {confirmReset ? (
            <div className="story-reset-confirm">
              <p>Die ganze Reise, alle Sterne und laufenden Versuche auf diesem Gerät zurücksetzen?</p>
              <button
                type="button"
                className="story-reset-button"
                onClick={() => {
                  onReset()
                  onClose()
                }}
              >
                Ja, Reise zurücksetzen
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
