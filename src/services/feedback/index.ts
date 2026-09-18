/**
 * Feedback-Service (Vorschläge, Kontakt, Fehlerreports).
 * Phase 1: kein Backend → vorausgefüllter GitHub-Issue-Link, ohne Secrets im Client.
 * Phase 2: Adapter auf Supabase Edge Function (serverseitige Validierung, Rate Limiting, Mailversand).
 */
export const REPO_URL = import.meta.env.VITE_REPO_URL ?? 'https://github.com/tqnoomaxx/geokompass'

export function buildIssueUrl(kind: 'suggest' | 'contact' | 'report', title: string, body: string) {
  const labels = { suggest: 'quiz-vorschlag', contact: 'kontakt', report: 'fehlerreport' }[kind]
  const u = new URL(`${REPO_URL}/issues/new`)
  u.searchParams.set('title', title.slice(0, 200))
  u.searchParams.set('body', body.slice(0, 6000))
  u.searchParams.set('labels', labels)
  return u.toString()
}

export interface FeedbackAdapter {
  send(kind: 'suggest' | 'contact' | 'report', payload: Record<string, string>): Promise<{ ok: boolean; url?: string }>
}

export const localFeedbackAdapter: FeedbackAdapter = {
  async send(kind, payload) {
    const title = payload.title ?? payload.subject ?? kind
    const body = Object.entries(payload)
      .filter(([k]) => k !== 'title' && k !== 'subject')
      .map(([k, v]) => `**${k}**\n${v}`)
      .join('\n\n')
    const queue = JSON.parse(localStorage.getItem('gk.feedback.queue') ?? '[]') as unknown[]
    queue.push({ kind, payload, at: new Date().toISOString() })
    localStorage.setItem('gk.feedback.queue', JSON.stringify(queue.slice(-50)))
    return { ok: true, url: buildIssueUrl(kind, title, body) }
  },
}
