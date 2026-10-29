export type NotebookAccess = { id: string; secret: string; pending?: boolean }
export type LearningNote = {
  id: string
  text: string
  context: string
  version: number
  createdAt: string
  updatedAt: string
}
export type NoteWrite = { id: string; text: string; context: string; expectedVersion: number }
export const NOTEBOOK_KEY = 'atlasfunke.notes.access.v1'
export const NOTE_LIMIT = 2000
const credential = /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.([a-f0-9]{64})$/i

export function parseNotebookLink(value: string): NotebookAccess | null {
  const raw = value.trim()
  let code = raw
  if (!credential.test(code)) {
    try {
      code = new URLSearchParams(new URL(raw).hash.slice(1)).get('notebook') ?? ''
    } catch {
      return null
    }
  }
  const match = credential.exec(code)
  return match ? { id: match[1].toLowerCase(), secret: match[2].toLowerCase() } : null
}
export function notebookLink(access: NotebookAccess, base: string) {
  const url = new URL('notes', base.endsWith('/') ? base : `${base}/`)
  url.hash = new URLSearchParams({ notebook: `${access.id}.${access.secret}` }).toString()
  return url.href
}
export function createNotebookAccess(): NotebookAccess {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return {
    id: crypto.randomUUID(),
    secret: [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
    pending: true,
  }
}
export function readNotebookAccess(): NotebookAccess | null {
  try {
    const saved = JSON.parse(localStorage.getItem(NOTEBOOK_KEY) ?? 'null')
    if (!saved || typeof saved.id !== 'string' || typeof saved.secret !== 'string') return null
    const access = parseNotebookLink(`${saved.id}.${saved.secret}`)
    return access ? { ...access, ...(saved.pending === true ? { pending: true } : {}) } : null
  } catch {
    return null
  }
}
export function storeNotebookAccess(access: NotebookAccess | null) {
  try {
    if (access) localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(access))
    else localStorage.removeItem(NOTEBOOK_KEY)
    return true
  } catch {
    return false
  }
}
export function parseNotesResponse(value: unknown): LearningNote[] {
  if (!value || typeof value !== 'object' || !('notes' in value) || !Array.isArray(value.notes))
    throw new Error('Ungültige Antwort des Notizservers.')
  if (value.notes.length > 200) throw new Error('Ungültige Anzahl an Notizen.')
  const ids = new Set<string>()
  return value.notes.map((note: unknown) => {
    if (!note || typeof note !== 'object') throw new Error('Ungültige Notiz.')
    const n = note as Record<string, unknown>
    if (
      typeof n.id !== 'string' ||
      typeof n.text !== 'string' ||
      typeof n.context !== 'string' ||
      typeof n.version !== 'number' ||
      !Number.isSafeInteger(n.version) ||
      n.version < 1 ||
      typeof n.createdAt !== 'string' ||
      typeof n.updatedAt !== 'string'
    )
      throw new Error('Ungültige Notiz.')
    if (
      n.text.length > NOTE_LIMIT ||
      n.context.length > 160 ||
      !Number.isFinite(Date.parse(n.createdAt)) ||
      !Number.isFinite(Date.parse(n.updatedAt)) ||
      ids.has(n.id)
    )
      throw new Error('Ungültige Notiz.')
    ids.add(n.id)
    return n as LearningNote
  })
}
