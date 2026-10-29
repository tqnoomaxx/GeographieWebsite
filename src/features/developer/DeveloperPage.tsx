import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/AuthProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { usePageViewState } from '@/app/usePageViewState'
import {
  improvements,
  IMPROVEMENT_PRIORITIES,
  IMPROVEMENT_STATUSES,
  type Improvement,
} from '@/services/improvements'
import { Page, Card } from '@/ui'
import { useDeveloperAccess } from './useDeveloperAccess'
import { ImprovementDialog } from './ImprovementDialog'
import './developer.css'

export default function DeveloperPage() {
  useDocumentTitle('Quiz-Verbesserungen')
  const access = useDeveloperAccess()
  const { user, mfaRequired } = useAuth()
  return (
    <Page title="Quiz-Verbesserungen" back="/settings">
      {access.loading ? (
        <p role="status">Entwicklerrechte werden geprüft …</p>
      ) : access.error ? (
        <Card>
          <p role="alert">Entwicklerrechte konnten nicht geprüft werden.</p>
          <button className="btn-secondary mt-3" onClick={access.retry}>
            Erneut prüfen
          </button>
        </Card>
      ) : access.allowed ? (
        <ImprovementList key={user?.id} />
      ) : (
        <Card>
          <h2 className="font-semibold">Entwicklerrechte erforderlich</h2>
          <p className="mt-2 text-sm text-ink-2">
            Hier sammeln Entwickler technische Fehler und Wünsche für die Quizzes.
          </p>
          {!user ? (
            <Link className="btn-primary mt-4" to="/login">
              Anmelden
            </Link>
          ) : mfaRequired ? (
            <Link className="btn-primary mt-4" to="/mfa">
              Zwei-Faktor-Anmeldung abschließen
            </Link>
          ) : (
            <p className="mt-3 text-sm">Dein Konto hat keine Entwicklerrechte.</p>
          )}
        </Card>
      )}
    </Page>
  )
}

function ImprovementList() {
  const { data, loading, error, reload } = useAsync(() => improvements.list(), [])
  const [query, setQuery] = usePageViewState('developer.query', '')
  const [filter, setFilter] = usePageViewState('developer.status', 'active')
  const [priority, setPriority] = usePageViewState('developer.priority', 'all')
  const [editing, setEditing] = useState<Improvement | 'new' | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const items = data ?? []
  const visible = items.filter(
    (item) =>
      (filter === 'all' || (filter === 'active' ? item.status !== 'done' : item.status === filter)) &&
      (priority === 'all' || item.priority === priority) &&
      `${item.title} ${item.description} ${item.context.label} ${item.context.generator ?? ''}`
        .toLocaleLowerCase('de')
        .includes(query.trim().toLocaleLowerCase('de')),
  )
  async function remove(item: Improvement) {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      await improvements.remove(item)
      setDeleting(null)
      reload()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Löschen fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <p className="mb-4 text-sm text-ink-2">
        Deine Werkbank für bessere Quizzes. Alle Entwickler sehen dieselbe Liste; Lernnotizen bleiben in
        deinem Notizblock.
      </p>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={() => setEditing('new')}>
          Verbesserung notieren
        </button>
        <button
          className="btn-secondary"
          disabled={loading || busy}
          onClick={() => {
            setMessage('')
            reload()
          }}
        >
          Liste neu laden
        </button>
      </div>
      {error ? (
        <Card>
          <p role="alert">{error.message}</p>
        </Card>
      ) : (
        <>
          <p className="mb-4 text-sm" aria-live="polite">
            {items.filter((i) => i.status === 'open').length} offen ·{' '}
            {items.filter((i) => i.status === 'working').length} in Arbeit ·{' '}
            {items.filter((i) => i.status === 'done').length} erledigt
          </p>
          <div className="dev-filters mb-5">
            <label>
              Suche
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Quiz oder Verbesserung suchen"
              />
            </label>
            <label>
              Status
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="active">Offen & in Arbeit</option>
                <option value="all">Alle</option>
                {Object.entries(IMPROVEMENT_STATUSES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priorität
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="all">Alle Prioritäten</option>
                {Object.entries(IMPROVEMENT_PRIORITIES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {message && (
            <p className="mb-4 text-sm text-bad" role="alert">
              {message}
            </p>
          )}
          {loading ? (
            <p role="status">Verbesserungen werden geladen …</p>
          ) : !visible.length ? (
            <Card>
              <h2 className="font-semibold">
                {items.length ? 'Keine passenden Einträge' : 'Noch keine Verbesserungen'}
              </h2>
              <p className="mt-2 text-sm text-ink-2">
                {items.length
                  ? 'Ändere die Suche oder Filter.'
                  : 'Öffne in einem Quiz „Verbessern“. Der Quizbezug wird automatisch angehängt.'}
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {visible.map((item) => (
                <article className="dev-item" key={item.id}>
                  <div className="dev-item-meta">
                    <span className="chip">{IMPROVEMENT_STATUSES[item.status]}</span>
                    <span>{IMPROVEMENT_PRIORITIES[item.priority]}</span>
                    <span>{new Date(item.created_at).toLocaleDateString('de-DE')}</span>
                  </div>
                  <h2 className="mt-3">{item.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{item.description}</p>
                  <p className="mt-3 text-sm text-ink-2">{item.context.label}</p>
                  {item.context.questionId && (
                    <details className="mt-2 text-xs text-ink-2">
                      <summary className="cursor-pointer">Frage und Technik</summary>
                      <p className="mt-2">
                        Frage: {item.context.questionId}
                        <br />
                        Generator: {item.context.generator}
                        <br />
                        Bereich: {item.context.scope}
                        <br />
                        Objekte: {item.context.entities?.join(', ')}
                      </p>
                    </details>
                  )}
                  <div className="dev-item-actions">
                    <Link
                      className="btn-secondary"
                      to={
                        item.context.path.startsWith('/') && !item.context.path.startsWith('//')
                          ? item.context.path
                          : '/play'
                      }
                    >
                      Quiz öffnen
                    </Link>
                    <button className="btn-secondary" onClick={() => setEditing(item)}>
                      Bearbeiten
                    </button>
                    <button
                      className="btn-ghost text-bad"
                      onClick={() => {
                        setMessage('')
                        setDeleting(item.id)
                      }}
                    >
                      Löschen
                    </button>
                  </div>
                  {deleting === item.id && (
                    <div className="mt-3 rounded-lg bg-card-2 p-3">
                      <p className="text-sm">Diesen Eintrag endgültig löschen?</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          disabled={busy}
                          className="btn-secondary text-bad"
                          onClick={() => void remove(item)}
                        >
                          {busy ? 'Löscht …' : 'Endgültig löschen'}
                        </button>
                        <button disabled={busy} className="btn-ghost" onClick={() => setDeleting(null)}>
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {editing && (
        <ImprovementDialog
          item={editing === 'new' ? undefined : editing}
          context={editing === 'new' ? { label: 'Allgemein · Atlasfunke', path: '/play' } : editing.context}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </>
  )
}
