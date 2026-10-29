import { describe, expect, it } from 'vitest'
import { pagesRedirect, pagesHistoryState } from './pagesRedirect'

describe('GitHub-Pages-Fallback', () => {
  it('behält Suchzustand und Fragment bei älteren Weiterleitungen', () => {
    expect(pagesRedirect('?p=/search&q=Berlin&type=city', '/GeographieWebsite/', '#results')).toBe(
      '/GeographieWebsite/search?q=Berlin&type=city#results',
    )
  })
  it('behält alle Quizparameter inklusive ausgewählter Lernkarten', () => {
    const route =
      '/play/trivia/round?mode=trivia_questions&scope=africa&len=1&only=trivia%3Asouth-africa-capitals&repeat=0'
    expect(pagesRedirect(`?p=${encodeURIComponent(route)}`, '/GeographieWebsite/')).toBe(
      `/GeographieWebsite${route}`,
    )
  })
  it('erhält Umlaute, Ampersands und reservierte Zeichen im neuen Format', () => {
    const route = '/search?q=' + encodeURIComponent('Österreich & ~and~') + '&type=country'
    expect(pagesRedirect(`?p=${encodeURIComponent(route)}`, '/')).toBe(route)
  })
  it('ändert normale URLs nicht und erlaubt ausschließlich lokale Pfade', () => {
    expect(pagesRedirect('?q=Berlin', '/')).toBeNull()
    expect(pagesRedirect('?p=//example.org', '/')).toBe('/example.org')
  })
  it('übernimmt nach dem 404-Umweg den ursprünglichen Verlauf einschließlich Seitenzustand', () => {
    const state = { idx: 2, key: 'settings-entry', usr: { atlasPageView: { query: 'Berlin' } } }
    const raw = JSON.stringify({ path: '/GeographieWebsite/settings', state, time: 1000 })
    expect(pagesHistoryState(raw, '/GeographieWebsite/settings', null, 4, 1100)).toEqual(state)
  })
  it('verwirft einen veralteten, fremden oder beschädigten Verlaufseintrag', () => {
    const destination = '/GeographieWebsite/settings'
    for (const raw of [
      null,
      'bad',
      '{}',
      JSON.stringify({ path: '/other', state: { idx: 1 }, time: 1000 }),
      JSON.stringify({ path: destination, state: { idx: 1 }, time: 0 }),
      JSON.stringify({ path: destination, state: { idx: -1 }, time: 100000 }),
      JSON.stringify({ path: destination, state: { idx: 99 }, time: 100000 }),
    ]) {
      expect(pagesHistoryState(raw, destination, 'fallback', 4, 100100)).toBe('fallback')
    }
  })
  it('beginnt bei einem neuen Dokumentaufruf einen frischen Seitenzustand und erhält sonstige Routerdaten', () => {
    const path = '/GeographieWebsite/settings'
    const raw = JSON.stringify({
      path,
      time: 1000,
      navigationType: 'navigate',
      state: { idx: 1, key: 'old-entry', usr: { returnTo: '/learn', atlasPageView: { query: 'old' } } },
    })
    expect(pagesHistoryState(raw, path, null, 3, 1100)).toEqual({ idx: 1, usr: { returnTo: '/learn' } })
  })
})
