import { describe, expect, it } from 'vitest'
import { createNotebookAccess, notebookLink, parseNotebookLink, parseNotesResponse } from './model'
const access = { id: '11111111-1111-4111-8111-111111111111', secret: 'a'.repeat(64) }

describe('Accountfreie Lernnotizen', () => {
  it('erzeugt unabhängige, ausreichend lange persönliche Zugänge', () => {
    const first = createNotebookAccess()
    const second = createNotebookAccess()
    expect(first.id).not.toBe(second.id)
    expect(first.secret).not.toBe(second.secret)
    expect(first.secret).toMatch(/^[a-f0-9]{64}$/)
    expect(parseNotebookLink(`${first.id}.${first.secret}`)).toEqual({ id: first.id, secret: first.secret })
  })
  it('verwendet den URL-Fragmentteil und behält den Projektpfad bei', () => {
    const link = notebookLink(access, 'https://example.com/GeographieWebsite/')
    const url = new URL(link)
    expect(url.pathname).toBe('/GeographieWebsite/notes')
    expect(url.search).toBe('')
    expect(url.hash).toContain('#notebook=')
    expect(parseNotebookLink(link)).toEqual(access)
    expect(parseNotebookLink(`  ${access.id}.${access.secret}  `)).toEqual(access)
  })
  it.each([
    '',
    'kein Link',
    'https://example.com/notes',
    'javascript:alert(1)',
    'https://example.com/notes#notebook=foo',
    `${access.id}.abc`,
    `${access.id}.${'a'.repeat(63)}`,
    `${access.id}.${'z'.repeat(64)}`,
  ])('akzeptiert keine unvollständigen Zugänge: %s', (value) => {
    expect(parseNotebookLink(value)).toBeNull()
  })
  it('prüft die Antwort des Notizservers statt unbekannte Daten anzuzeigen', () => {
    const note = {
      id: access.id,
      text: '<script>Nur Text</script>',
      context: 'Flaggen',
      version: 1,
      createdAt: '2026-10-29T12:00:00Z',
      updatedAt: '2026-10-29T12:00:00Z',
    }
    expect(parseNotesResponse({ notes: [note] })).toEqual([note])
    expect(parseNotesResponse({ notes: [] })).toEqual([])
    expect(() => parseNotesResponse({ notes: [{ ...note, version: -1 }] })).toThrow()
    expect(() => parseNotesResponse({ notes: [{ ...note, updatedAt: 'gestern' }] })).toThrow()
    expect(() => parseNotesResponse({ notes: [note, note] })).toThrow()
    expect(() => parseNotesResponse({ notes: null })).toThrow()
    expect(() => parseNotesResponse({ notes: ['foo'] })).toThrow()
  })
})
