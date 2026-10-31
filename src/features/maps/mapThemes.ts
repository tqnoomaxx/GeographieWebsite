import { normalizeAnswer } from '@/engine/normalize'
import type { Country } from '@/domain/types'

export interface CountryMapFacts {
  checkedAt: string
  source: { name: string; url: string; license: string; revision: string }
  countries: Record<
    string,
    { callingCodes: string[]; drivingSide?: 'left' | 'right'; note?: string; sourceUrl?: string }
  >
}
export type MapTheme = 'calling' | 'driving' | 'domains' | 'currencies'
export const MAP_THEMES: { id: MapTheme; title: string; description: string }[] = [
  {
    id: 'calling',
    title: 'Telefonvorwahlen',
    description: 'Internationale Vorwahlen weltweit. Die Farben zeigen die erste Ziffer der Vorwahl.',
  },
  {
    id: 'driving',
    title: 'Links- & Rechtsverkehr',
    description: 'Auf welcher Straßenseite wird gefahren? Vergleiche Länder und ihre Nachbarn.',
  },
  {
    id: 'domains',
    title: 'Internet-Endungen',
    description: 'Von .de bis .jp: die länderspezifischen Internet-Endungen. Farben stehen für Kontinente.',
  },
  {
    id: 'currencies',
    title: 'Währungen',
    description:
      'Wo gelten Euro, US-Dollar und andere Währungen? Mehrere Währungen werden gemeinsam angezeigt.',
  },
]
export const MAP_PALETTE = [
  '#367f9b',
  '#bd7444',
  '#7e72b5',
  '#5c8e56',
  '#b65e78',
  '#a08a3a',
  '#4571a8',
  '#78954a',
  '#aa6356',
]
export const UNKNOWN_COLOR = '#abb6b2'
const CONTINENTS: Record<string, string> = {
  europe: 'Europa',
  asia: 'Asien',
  africa: 'Afrika',
  'north-america': 'Nordamerika',
  'south-america': 'Südamerika',
  oceania: 'Ozeanien',
  antarctica: 'Antarktis',
}
export function themeValue(country: Country, facts: CountryMapFacts, theme: MapTheme) {
  const extra = facts.countries[country.id]
  if (theme === 'calling') {
    const codes = extra?.callingCodes ?? []
    return {
      label: codes.join(' · '),
      compact: codes[0] ? codes[0] + (codes.length > 1 ? ' …' : '') : '',
      group: codes[0]?.charAt(1) ?? 'unknown',
    }
  }
  if (theme === 'driving') {
    const side = extra?.drivingSide
    return {
      label: side === 'left' ? 'Linksverkehr' : side === 'right' ? 'Rechtsverkehr' : '',
      compact: side === 'left' ? 'L' : side === 'right' ? 'R' : '',
      group: side ?? 'unknown',
    }
  }
  if (theme === 'domains') {
    const domains = country.attributes.tld ?? []
    return {
      label: domains.join(' · '),
      compact: domains[0] ?? '',
      group: domains.length ? (country.attributes.continent ?? 'unknown') : 'unknown',
    }
  }
  const currencies = country.attributes.currencies ?? []
  const codes = currencies.map((currency) => currency.code)
  const group =
    ['EUR', 'USD', 'XOF', 'XAF'].find((code) => codes.includes(code)) ?? (codes.length ? 'other' : 'unknown')
  return {
    label: currencies.map((currency) => `${currency.code} · ${currency.name}`).join(' / '),
    compact: codes.join('/'),
    group,
  }
}
export function themeGroups(theme: MapTheme) {
  if (theme === 'calling')
    return Array.from({ length: 9 }, (_, i) => ({
      id: String(i + 1),
      title: `+${i + 1}…`,
      color: MAP_PALETTE[i],
    }))
  if (theme === 'driving')
    return [
      { id: 'left', title: 'Linksverkehr', color: MAP_PALETTE[0] },
      { id: 'right', title: 'Rechtsverkehr', color: MAP_PALETTE[1] },
    ]
  if (theme === 'domains')
    return Object.entries(CONTINENTS).map(([id, title], i) => ({ id, title, color: MAP_PALETTE[i] }))
  return [
    { id: 'EUR', title: 'Euro', color: MAP_PALETTE[0] },
    { id: 'USD', title: 'US-Dollar', color: MAP_PALETTE[1] },
    { id: 'XOF', title: 'CFA-Franc BCEAO', color: MAP_PALETTE[2] },
    { id: 'XAF', title: 'CFA-Franc BEAC', color: MAP_PALETTE[3] },
    { id: 'other', title: 'Weitere Währungen', color: MAP_PALETTE[4] },
  ]
}

export function matchesMapSearch(country: Country, facts: CountryMapFacts, theme: MapTheme, query: string) {
  const raw = query.trim()
  if (!raw) return true
  if (theme === 'calling' && /^(?:\+|00)?\d[\d\s()-]*$/.test(raw)) {
    const digits = raw.replace(/\D/g, '').replace(/^00/, '')
    return (facts.countries[country.id]?.callingCodes ?? []).some((code) => code.startsWith('+' + digits))
  }
  const value = themeValue(country, facts, theme)
  return normalizeAnswer(
    [
      country.names.de,
      country.names.en,
      country.attributes.iso2,
      ...(country.aliases ?? []),
      value.label,
    ].join(' '),
  ).includes(normalizeAnswer(raw))
}
