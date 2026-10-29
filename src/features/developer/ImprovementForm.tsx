import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  improvements,
  IMPROVEMENT_PRIORITIES,
  IMPROVEMENT_STATUSES,
  type Improvement,
  type ImprovementContext,
  type ImprovementPriority,
  type ImprovementStatus,
} from '@/services/improvements'

export function ImprovementForm({
  context,
  item,
  onSaved,
}: {
  context: ImprovementContext
  item?: Improvement
  onSaved?: () => void
}) {
  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [priority, setPriority] = useState<ImprovementPriority>(item?.priority ?? 'normal')
  const [status, setStatus] = useState<ImprovementStatus>(item?.status ?? 'open')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !title.trim() || !description.trim()) return
    setBusy(true)
    setError('')
    try {
      const input = { title, description, priority, status }
      if (item) await improvements.update(item, input)
      else await improvements.create(input, context)
      setSaved(true)
      onSaved?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Speichern fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }
  if (saved)
    return (
      <div className="grid gap-3" role="status">
        <p>✓ Verbesserung gespeichert.</p>
        <Link className="btn-secondary" to="/developer">
          Zum Entwicklerpanel
        </Link>
      </div>
    )
  return (
    <form className="dev-form" onSubmit={submit}>
      <p className="text-sm text-ink-2">{context.label} · Nur für Entwickler sichtbar.</p>
      <label>
        Titel
        <input
          autoFocus
          required
          minLength={3}
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Was soll besser werden?"
        />
      </label>
      <label>
        Verbesserung
        <textarea
          required
          maxLength={4000}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Was stört dich, und wie möchtest du es stattdessen haben?"
        />
      </label>
      <div className="dev-form-row">
        <label>
          Priorität
          <select value={priority} onChange={(e) => setPriority(e.target.value as ImprovementPriority)}>
            {Object.entries(IMPROVEMENT_PRIORITIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {item && (
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as ImprovementStatus)}>
              {Object.entries(IMPROVEMENT_STATUSES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <button
        className="btn-primary"
        type="submit"
        disabled={busy || title.trim().length < 3 || !description.trim()}
      >
        {busy ? 'Speichert …' : item ? 'Änderungen speichern' : 'Verbesserung speichern'}
      </button>
    </form>
  )
}
