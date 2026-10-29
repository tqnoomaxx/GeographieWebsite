import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/services/auth'
import { parseNotesResponse, type LearningNote, type NotebookAccess, type NoteWrite } from './model'

export const notesConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY)
let client: Promise<SupabaseClient> | undefined
export class NotebookError extends Error {
  code: string
  constructor(code: string) {
    const messages: Record<string, string> = {
      notebook_not_found:
        'Das Notizbuch wurde nicht gefunden. Prüfe, ob du den vollständigen persönlichen Link verwendet hast.',
      note_conflict:
        'Diese Notiz wurde auf einem anderen Gerät verändert. Dein Text bleibt als neuer Entwurf stehen. Lade die Notizen neu und prüfe die aktuelle Version.',
      notebook_full: 'Dein Notizbuch enthält bereits 200 Notizen. Entferne zuerst eine erledigte Notiz.',
      rate_limited: 'Zu viele Anfragen auf einmal. Versuche es in einer Minute erneut.',
      not_configured: 'Die Online-Notizen sind noch nicht eingerichtet.',
      store_unavailable:
        'Der Notizserver ist gerade nicht erreichbar. Dein Text bleibt stehen. Versuche es erneut.',
      invalid_note: 'Die Notiz konnte nicht gespeichert werden. Erlaubt sind 1 bis 2.000 Zeichen.',
    }
    super(messages[code] ?? messages.store_unavailable)
    this.code = code
  }
}
export async function requestNotebook(
  access: NotebookAccess,
  action: 'create' | 'list' | 'save' | 'delete' | 'destroy',
  note?: NoteWrite,
  signal?: AbortSignal,
): Promise<LearningNote[]> {
  if (!notesConfigured) throw new NotebookError('not_configured')
  // Dedicated in-memory client: notebook access never depends on a signed-in account.
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }),
  )
  const { data, error } = await (
    await client
  ).functions.invoke('quiz-notes', {
    body: { action, notebookId: access.id, secret: access.secret, ...(note ? { note } : {}) },
    signal,
  })
  if (error) {
    const response = (error as { context?: unknown }).context
    const body =
      response instanceof Response
        ? await response
            .clone()
            .json()
            .catch(() => null)
        : null
    throw new NotebookError(body?.error ?? 'store_unavailable')
  }
  return parseNotesResponse(data)
}
