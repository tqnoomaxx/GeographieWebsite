import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Cloud, CloudOff, Copy, Link2, LogOut, Pencil, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { NotebookError, notesConfigured, requestNotebook } from '@/services/notes/client'
import {
  createNotebookAccess,
  parseNotebookLink,
  notebookLink,
  NOTE_LIMIT,
  readNotebookAccess,
  storeNotebookAccess,
  type LearningNote,
  type NotebookAccess,
} from '@/services/notes/model'
import './notes.css'

export function NotesPanel({
  context = 'Meine Lernziele',
  initialAccess,
}: {
  context?: string
  initialAccess?: NotebookAccess | null
}) {
  const [access, setAccess] = useState<NotebookAccess | null>(() => initialAccess ?? readNotebookAccess())
  const [notes, setNotes] = useState<LearningNote[]>([])
  const [draft, setDraft] = useState('')
  const [draftContext, setDraftContext] = useState(context)
  const [editing, setEditing] = useState<LearningNote | null>(null)
  const [connection, setConnection] = useState('')
  const [loading, setLoading] = useState(!!access && notesConfigured)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [remembered, setRemembered] = useState(true)
  const [copied, setCopied] = useState(false)
  const [confirmDestroy, setConfirmDestroy] = useState(false)
  const busyRef = useRef(false)
  const sequence = useRef(0)
  const persistedAccess = useRef('')
  const mounted = useRef(true)
  const newNoteId = useRef<string | undefined>(undefined)
  const input = useRef<HTMLTextAreaElement>(null)
  const shareInput = useRef<HTMLInputElement>(null)
  const shareLink = access ? notebookLink(access, `${location.origin}${import.meta.env.BASE_URL}`) : ''
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      sequence.current++
    }
  }, [])
  const remember = useCallback((next: NotebookAccess | null) => {
    persistedAccess.current = next ? `${next.id}.${next.secret}` : ''
    setRemembered(storeNotebookAccess(next))
    setAccess(next)
  }, [])
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!access || !notesConfigured || busyRef.current) return
      const request = ++sequence.current
      setLoading(true)
      try {
        const loaded = await requestNotebook(access, 'list', undefined, signal)
        if (!mounted.current || request !== sequence.current || signal?.aborted) return
        setNotes(loaded)
        setError('')
        if (access.pending) remember({ id: access.id, secret: access.secret })
        else if (persistedAccess.current !== `${access.id}.${access.secret}`) {
          persistedAccess.current = `${access.id}.${access.secret}`
          setRemembered(storeNotebookAccess(access))
        }
      } catch (cause) {
        if (!mounted.current || request !== sequence.current || signal?.aborted) return
        if (!(access.pending && cause instanceof NotebookError && cause.code === 'notebook_not_found'))
          setError(cause instanceof Error ? cause.message : 'Notizen konnten nicht geladen werden.')
      } finally {
        if (mounted.current && request === sequence.current) setLoading(false)
      }
    },
    [access, remember],
  )
  useEffect(() => {
    const abort = new AbortController()
    void refresh(abort.signal)
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh(abort.signal)
    }
    const interval = window.setInterval(onFocus, 15_000)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      abort.abort()
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refresh])
  const start = () => {
    if (busyRef.current) return false
    busyRef.current = true
    sequence.current++
    setLoading(false)
    setBusy(true)
    setError('')
    setNotice('')
    return true
  }
  const end = () => {
    busyRef.current = false
    if (mounted.current) setBusy(false)
  }
  const clearDraft = () => {
    setDraft('')
    setEditing(null)
    setDraftContext(context)
    newNoteId.current = undefined
  }
  const save = async () => {
    if (!draft.trim() || !notesConfigured || !start()) return
    const target = access ?? createNotebookAccess()
    // Remember a pending link before the request. A lost response can be retried safely.
    if (!access) remember(target)
    newNoteId.current ??= crypto.randomUUID()
    const id = editing?.id ?? newNoteId.current
    try {
      const loaded = await requestNotebook(target, target.pending ? 'create' : 'save', {
        id,
        text: draft.trim(),
        context: draftContext.slice(0, 160),
        expectedVersion: editing?.version ?? 0,
      })
      if (!mounted.current) {
        storeNotebookAccess({ id: target.id, secret: target.secret })
        return
      }
      remember({ id: target.id, secret: target.secret })
      setNotes(loaded)
      // An idempotent retry must not silently discard a changed local draft.
      if (loaded.find((note) => note.id === id)?.text !== draft.trim()) {
        setError(
          'Auf dem Server liegt bereits eine andere Version. Dein Text bleibt als neuer Entwurf stehen.',
        )
        setEditing(null)
        newNoteId.current = undefined
      } else {
        clearDraft()
        setNotice('Notiz online gespeichert.')
      }
    } catch (cause) {
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : 'Die Notiz konnte nicht gespeichert werden.')
        if (cause instanceof NotebookError && cause.code === 'note_conflict') {
          setEditing(null)
          newNoteId.current = undefined
        }
      }
    } finally {
      end()
    }
  }
  const remove = async (note: LearningNote) => {
    if (!access || !start()) return
    try {
      const loaded = await requestNotebook(access, 'delete', {
        id: note.id,
        text: note.text,
        context: note.context,
        expectedVersion: note.version,
      })
      if (mounted.current) {
        setNotes(loaded)
        setNotice('Notiz auf allen Geräten gelöscht.')
        if (editing?.id === note.id) clearDraft()
      }
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : 'Die Notiz konnte nicht gelöscht werden.')
    } finally {
      end()
    }
  }
  const connect = async () => {
    const target = parseNotebookLink(connection)
    if (!target) {
      setError('Füge den vollständigen Notizlink oder den Zugangscode aus dem Link ein.')
      return
    }
    if (!start()) return
    try {
      const loaded = await requestNotebook(target, 'list')
      if (mounted.current) {
        remember(target)
        setNotes(loaded)
        setConnection('')
        setNotice('Notizbuch verbunden.')
        setCopied(false)
        setConfirmDestroy(false)
      }
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : 'Notizbuch konnte nicht verbunden werden.')
    } finally {
      end()
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
    } catch {
      shareInput.current?.focus()
      shareInput.current?.select()
      setNotice('Markierter Link: Kopiere ihn über das Menü deines Geräts.')
    }
  }
  const disconnect = () => {
    remember(null)
    setNotes([])
    setError('')
    setNotice('Auf diesem Gerät getrennt. Mit deinem Link kannst du das Notizbuch wieder öffnen.')
    setCopied(false)
    setConfirmDestroy(false)
    setConnection('')
  }
  const destroy = async () => {
    if (!access || !start()) return
    try {
      await requestNotebook(access, 'destroy')
      if (mounted.current) {
        disconnect()
        clearDraft()
        setNotice('Notizbuch und alle Notizen auf allen Geräten gelöscht.')
      }
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : 'Notizbuch konnte nicht gelöscht werden.')
    } finally {
      end()
    }
  }
  if (!notesConfigured)
    return (
      <div className="learning-notes-body">
        <div className="notes-unavailable" role="status">
          <CloudOff aria-hidden />
          <h3>Online-Notizen noch nicht verbunden</h3>
          <p>
            Für dein gemeinsames Notizbuch muss zuerst der Notizserver eingerichtet werden. Danach kannst du
            deine Notizen ohne Account auf allen Geräten öffnen.
          </p>
        </div>
      </div>
    )
  return (
    <div className="learning-notes-body" aria-busy={busy}>
      <p className="notes-intro">
        Was möchtest du noch üben? Deine Notizen bleiben mit deinem persönlichen Link auf allen Geräten
        erreichbar.
      </p>
      <form
        className="notes-compose"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <label htmlFor="learning-note-draft">
          {editing ? 'Notiz bearbeiten' : 'Das möchte ich verbessern'}
        </label>
        <span className="notes-context">{draftContext}</span>
        <textarea
          ref={input}
          id="learning-note-draft"
          rows={3}
          maxLength={NOTE_LIMIT}
          placeholder="Zum Beispiel: Die Hauptstädte in Afrika wiederholen …"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={busy}
        />
        <div className="notes-compose-actions">
          <span>{draft.length.toLocaleString('de-DE')} / 2.000</span>
          {editing && (
            <button className="notes-text-button" type="button" disabled={busy} onClick={clearDraft}>
              <X aria-hidden />
              Abbrechen
            </button>
          )}
          <button className="notes-primary" type="submit" disabled={busy || loading || !draft.trim()}>
            <Save aria-hidden />
            {busy ? 'Wird gespeichert …' : editing ? 'Änderung speichern' : 'Notiz speichern'}
          </button>
        </div>
      </form>
      {error && (
        <div className="notes-error" role="alert">
          <p>{error}</p>
          {access && (
            <button
              type="button"
              className="notes-text-button"
              disabled={busy || loading}
              onClick={() => void refresh()}
            >
              <RefreshCw aria-hidden />
              Notizen neu laden
            </button>
          )}
        </div>
      )}
      <p className="notes-notice" role="status" aria-live="polite">
        {notice}
      </p>
      {!remembered && access && (
        <p className="notes-error">
          Dein Browser merkt sich den Zugang gerade nicht. Kopiere deinen persönlichen Link, um das Notizbuch
          später wieder zu öffnen.
        </p>
      )}
      {access && (
        <details className="notes-access">
          <summary>
            <Link2 aria-hidden />
            Auf einem anderen Gerät öffnen
          </summary>
          <p>
            Öffne diesen persönlichen Link auf deinem anderen Gerät. Wer ihn hat, kann deine Notizen lesen,
            ändern und löschen. Bewahre ihn für später auf.
          </p>
          <label className="notes-sr-only" htmlFor="learning-notebook-link">
            Persönlicher Notizlink
          </label>
          <div className="notes-link-row">
            <input
              ref={shareInput}
              id="learning-notebook-link"
              value={shareLink}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" className="notes-primary" onClick={() => void copy()}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? 'Kopiert' : 'Kopieren'}
            </button>
          </div>
          <div className="notes-access-actions">
            <button type="button" className="notes-text-button" disabled={busy} onClick={disconnect}>
              <LogOut aria-hidden />
              Dieses Gerät trennen
            </button>
            {confirmDestroy ? (
              <div className="notes-destroy-confirm">
                <p>Das ganze Notizbuch auf allen Geräten löschen? Der Link funktioniert danach nicht mehr.</p>
                <button type="button" className="notes-danger" disabled={busy} onClick={() => void destroy()}>
                  Ja, alles löschen
                </button>
                <button type="button" className="notes-text-button" onClick={() => setConfirmDestroy(false)}>
                  Abbrechen
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="notes-text-button notes-delete-book"
                disabled={busy}
                onClick={() => setConfirmDestroy(true)}
              >
                <Trash2 aria-hidden />
                Notizbuch löschen
              </button>
            )}
          </div>
        </details>
      )}
      <section className="notes-list" aria-labelledby="learning-notes-list-title">
        <header>
          <h3 id="learning-notes-list-title">
            Meine Lernnotizen <span>{notes.length}</span>
          </h3>
          {access && (
            <button
              type="button"
              className="notes-icon-button"
              aria-label="Notizen aktualisieren"
              disabled={busy || loading}
              onClick={() => void refresh()}
            >
              <RefreshCw aria-hidden className={loading ? 'is-refreshing' : ''} />
            </button>
          )}
        </header>
        {loading && !notes.length ? (
          <p className="notes-empty" role="status">
            Notizen werden geladen …
          </p>
        ) : !notes.length ? (
          <p className="notes-empty">Hier ist Platz für deine nächsten Lernziele.</p>
        ) : (
          <ul>
            {notes.map((note) => (
              <li key={note.id} data-learning-note={note.id}>
                <span className="notes-context">{note.context}</span>
                <p>{note.text}</p>
                <div className="notes-item-footer">
                  <time dateTime={note.updatedAt}>
                    {new Intl.DateTimeFormat('de-DE', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }).format(new Date(note.updatedAt))}
                  </time>
                  <div>
                    <button
                      type="button"
                      className="notes-icon-button"
                      aria-label="Notiz bearbeiten"
                      disabled={busy}
                      onClick={() => {
                        setEditing(note)
                        setDraft(note.text)
                        setDraftContext(note.context)
                        setError('')
                        setNotice('')
                        input.current?.focus()
                        input.current?.scrollIntoView({ block: 'nearest' })
                      }}
                    >
                      <Pencil aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="notes-icon-button is-danger"
                      aria-label="Notiz löschen"
                      disabled={busy}
                      onClick={() => void remove(note)}
                    >
                      <Trash2 aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <details className="notes-connect">
        <summary>Vorhandenes Notizbuch öffnen</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void connect()
          }}
        >
          <label htmlFor="learning-notebook-connect">Persönlichen Notizlink oder Zugangscode einfügen</label>
          <input
            id="learning-notebook-connect"
            autoComplete="off"
            type="text"
            value={connection}
            onChange={(event) => setConnection(event.target.value)}
            placeholder="https://…/notes#notebook=…"
          />
          <button className="notes-secondary" disabled={busy || !connection.trim()}>
            <Link2 aria-hidden />
            Notizbuch verbinden
          </button>
        </form>
      </details>
      <p className="notes-sync-caption">
        <Cloud aria-hidden />
        Ohne Anmeldung · Online gespeichert · Automatischer Abgleich beim Öffnen
      </p>
    </div>
  )
}
