import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SessionQuestion } from '@/engine/session'
import { profileHit } from '@/engine/profile'
import './quiz-selection.css'
export function ProfileQuestion({
  item,
  onInput,
  onAnswer,
  onNext,
}: {
  item: SessionQuestion
  onInput: (value: string) => void
  onAnswer: (value: string) => void
  onNext: () => void
}) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const next = useRef<HTMLButtonElement>(null)
  const composing = useRef(false)
  const fields = item.question.profileFields ?? []
  const values = item.profileAnswers ?? {}
  const answered = item.given !== undefined
  useEffect(() => {
    if (answered) next.current?.focus()
    else input.current?.focus()
  }, [answered])
  const accept = (value: string) => {
    setText(value)
    if (!composing.current && profileHit(fields, values, value)) {
      onInput(value)
      setText('')
    }
  }
  const solved = fields.filter((f) => values[f.id]).length
  return (
    <section
      className="profile-game"
      data-question-type="profile_input"
      data-generator="country_profile"
      data-answer={item.question.answer}
    >
      <h1>{t(item.question.prompt.key, item.question.prompt.params)}</h1>
      <p className="profile-game-intro">
        Fünf Kategorien, ein Eingabefeld. Tippe in beliebiger Reihenfolge. Eine gültige Antwort pro Kategorie
        genügt.
      </p>
      {!answered && (
        <input
          ref={input}
          className="profile-input"
          aria-label="Antwort eingeben"
          placeholder="Zum Beispiel Hauptstadt oder Währung …"
          value={text}
          onChange={(e) => accept(e.target.value)}
          onCompositionStart={() => {
            composing.current = true
          }}
          onCompositionEnd={(e) => {
            composing.current = false
            accept(e.currentTarget.value)
          }}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
        />
      )}
      <p className="profile-game-status" role="status" aria-live="polite">
        {answered
          ? item.correct
            ? 'Alle fünf Kategorien gelöst.'
            : 'Auflösung'
          : `${solved} von ${fields.length} Kategorien gelöst`}
      </p>
      <dl className="profile-fields">
        {fields.map((f) => (
          <div className="profile-field" key={f.id} data-field={f.id} data-solved={!!values[f.id]}>
            <dt>{f.label}</dt>
            <dd>{values[f.id] ? <>✓ {values[f.id]}</> : answered ? f.display : '—'}</dd>
          </div>
        ))}
      </dl>
      <div className="profile-game-actions">
        {answered ? (
          <button ref={next} type="button" className="profile-next" onClick={onNext}>
            Nächstes Land →
          </button>
        ) : (
          <button type="button" className="btn-ghost" onClick={() => onAnswer('__skip__')}>
            Auflösen
          </button>
        )}
      </div>
    </section>
  )
}
