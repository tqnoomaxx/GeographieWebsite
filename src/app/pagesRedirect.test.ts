import { describe, expect, it } from 'vitest'
import { pagesRedirect } from './pagesRedirect'

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
})
