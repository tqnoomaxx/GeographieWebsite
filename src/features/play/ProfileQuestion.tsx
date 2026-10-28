import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SessionQuestion } from '@/engine/session'
import { profileHasLongerMatch, profileHit, profileHits } from '@/engine/profile'
import { normalizeAnswer } from '@/engine/normalize'
import type { ProfileField } from '@/engine/types'
import './quiz-selection.css'

const EMPTY_VALUES: Record<string, string> = {}
const EMPTY_FIELDS: ProfileField[] = []

export function ProfileQuestion({
  item,
  learning,
  onInput,
  onAnswer,
  onNext,
}: {
  item: SessionQuestion
  learning?: boolean
  onInput: (value: string, fieldId?: string) => void
  onAnswer: (value: string) => void
  onNext: () => void
}) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [message, setMessage] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const next = useRef<HTMLButtonElement>(null)
  const composing = useRef(false)
  const fields = item.question.profileFields ?? EMPTY_FIELDS
  const values = item.profileAnswers ?? EMPTY_VALUES
  const answered = item.given !== undefined
  const ambiguous = profileHits(fields, values, text)
  const solved = fields.filter((field) => values[field.id]).length
  const remaining = fields.length - solved
  useEffect(() => {
    if (answered) next.current?.focus()
    else input.current?.focus()
  }, [answered])
  useEffect(() => {
    if (
      answered ||
      composing.current ||
      !text ||
      !profileHit(fields, values, text) ||
      !profileHasLongerMatch(fields, values, text)
    )
      return
    const timer = window.setTimeout(() => {
      onInput(text)
      setText('')
      setMessage('')
    }, 600)
    return () => window.clearTimeout(timer)
  }, [text, fields, values, answered, onInput])
  const commit = (value: string, fieldId?: string, refocus = true) => {
    onInput(value, fieldId)
    setText('')
    setMessage('')
    if (refocus) input.current?.focus({ preventScroll: true })
  }
  const accept = (value: string) => {
    setText(value)
    setMessage('')
    if (
      !composing.current &&
      profileHit(fields, values, value) &&
      !profileHasLongerMatch(fields, values, value)
    )
      commit(value)
  }
  return (
    <section
      className="profile-game"
      data-question-type="profile_input"
      data-generator="country_profile"
      data-answer={item.question.answer}
      data-profile-learning={!!learning}
      data-profile-review={!!item.repeated}
    >
      {item.repeated && (
        <p className="profile-review-banner">
          ↻ Wiederholung · {fields.length} {fields.length === 1 ? 'offene Kategorie' : 'offene Kategorien'}
        </p>
      )}
      <h1>{t(item.question.prompt.key, item.question.prompt.params)}</h1>
      <p className="profile-game-intro">
        {fields.length} {fields.length === 1 ? 'Kategorie' : 'Kategorien'}, ein Eingabefeld. Eine richtige
        Antwort genügt, um alle gültigen Antworten der Kategorie aufzudecken.
      </p>
      {!answered && (
        <form
          className="profile-answer-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (profileHit(fields, values, text)) commit(text)
            else
              setMessage(
                ambiguous.length > 1
                  ? 'Wähle unten die passende Kategorie.'
                  : 'Noch kein Treffer. Versuche eine andere Antwort oder löse die fehlenden Felder auf.',
              )
          }}
        >
          <input
            ref={input}
            className="profile-input"
            aria-label="Antwort eingeben"
            placeholder="Zum Beispiel Hauptstadt, Währung oder höchste Erhebung …"
            value={text}
            onChange={(event) => accept(event.target.value)}
            onBlur={() => {
              if (!composing.current && profileHit(fields, values, text)) commit(text, undefined, false)
            }}
            onCompositionStart={() => {
              composing.current = true
            }}
            onCompositionEnd={(event) => {
              composing.current = false
              accept(event.currentTarget.value)
            }}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
          />
          {ambiguous.length > 1 && (
            <div
              className="profile-disambiguation"
              role="group"
              aria-label="Antwort einer Kategorie zuordnen"
            >
              <p>Diese Antwort passt zu mehreren Kategorien:</p>
              {ambiguous.map((field) => (
                <button type="button" key={field.id} onClick={() => commit(text, field.id)}>
                  {field.label}
                </button>
              ))}
            </div>
          )}
          {message && (
            <p className="profile-input-message" role="status">
              {message}
            </p>
          )}
        </form>
      )}
      <p className="profile-game-status" role="status" aria-live="polite">
        {answered
          ? item.correct
            ? fields.length === 1
              ? 'Kategorie gelöst.'
              : `Alle ${fields.length} Kategorien gelöst.`
            : 'Auflösung – die fehlenden Antworten sind sichtbar.'
          : `${solved} von ${fields.length} Kategorien gelöst`}
      </p>
      <dl className="profile-fields">
        {fields.map((field) => {
          const value = values[field.id]
          const showEntered = value && !normalizeAnswer(field.display).includes(normalizeAnswer(value))
          return (
            <div
              className="profile-field"
              key={field.id}
              data-field={field.id}
              data-solved={!!value}
              data-revealed={answered && !value}
            >
              <dt>{field.label}</dt>
              <dd aria-live="polite">
                {value ? (
                  <>
                    <span className="profile-answer-value">✓ {field.display}</span>
                    {showEntered && <small className="profile-entered">Deine Eingabe: {value}</small>}
                  </>
                ) : answered ? (
                  field.display
                ) : (
                  '—'
                )}
              </dd>
            </div>
          )
        })}
      </dl>
      {learning && answered && !item.correct && (
        <p className="profile-learning-note">
          {remaining} {remaining === 1 ? 'Kategorie wird' : 'Kategorien werden'} später erneut abgefragt.
          Bereits gelöste Felder musst du nicht wiederholen.
        </p>
      )}
      <div className="profile-game-actions">
        {answered ? (
          <button ref={next} type="button" className="profile-next" onClick={onNext}>
            {item.repeated ? 'Weiterlernen' : 'Nächstes Land'} →
          </button>
        ) : (
          <button type="button" className="btn-ghost" onClick={() => onAnswer('__skip__')}>
            {learning ? 'Auflösen und später wiederholen' : 'Auflösen'}
          </button>
        )}
      </div>
    </section>
  )
}
