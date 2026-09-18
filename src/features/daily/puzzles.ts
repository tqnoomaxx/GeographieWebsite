import type { Country, Entity } from '@/domain/types'
import { createRng, todayKey } from '@/engine/rng'
import { baseDifficulty } from '@/engine/difficulty'

export const MAX_ATTEMPTS = 6

export interface PuzzleDef {
  id: 'flagle' | 'countryle' | 'outline' | 'capitale'
  icon: string
  available: boolean
}

export const PUZZLES: PuzzleDef[] = [
  { id: 'flagle', icon: '🏳️', available: true },
  { id: 'countryle', icon: '🌍', available: true },
  { id: 'outline', icon: '🗺️', available: true },
  { id: 'capitale', icon: '🏛️', available: true },
]

/** Wochentag steuert Schwierigkeit: Mo leicht … So schwer. */
function difficultyForDate(date: string): 1 | 2 | 3 {
  const day = new Date(date + 'T12:00:00Z').getUTCDay() // 0 So .. 6 Sa
  if (day === 1 || day === 2) return 1
  if (day === 3 || day === 4 || day === 5) return 2
  return 3
}

export function eligibleCountries(countries: Country[], puzzle: PuzzleDef['id']): Country[] {
  return countries.filter((c) => {
    if (c.attributes.independent === false) return false
    if (!c.location) return false
    if (puzzle === 'flagle' && !c.media?.some((m) => m.kind === 'flag')) return false
    if (puzzle === 'outline' && !c.geometry) return false
    if (puzzle === 'capitale' && !c.attributes.capital) return false
    return true
  })
}

/** Wählt die Tages-Entity deterministisch: gleicher Tag = gleiches Rätsel für alle. */
export function pickDaily(countries: Country[], puzzle: PuzzleDef['id'], date = todayKey(), practiceSeed?: string): Country {
  const pool = eligibleCountries(countries, puzzle)
  const wanted = difficultyForDate(date)
  const tier = pool.filter((c) => baseDifficulty(c) === wanted)
  const rng = createRng(practiceSeed ? `${puzzle}:practice:${practiceSeed}` : `${puzzle}:${date}`)
  return rng.pick(tier.length >= 10 ? tier : pool)
}

const R = 6371
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

export function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(toRad(b.lon - a.lon)) * Math.cos(toRad(b.lat))
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lon - a.lon))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function arrowFor(deg: number): string {
  const arrows = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️']
  return arrows[Math.round(deg / 45) % 8]
}

export function proximityEmoji(km: number): string {
  if (km === 0) return '🟩🟩🟩🟩🟩'
  const pct = Math.max(0, 1 - km / 20000)
  const full = Math.round(pct * 5)
  return '🟩'.repeat(full) + '⬜'.repeat(5 - full)
}

export function compare(a: number | undefined, b: number | undefined): '▲' | '▼' | '=' | '?' {
  if (a === undefined || b === undefined) return '?'
  if (a === b) return '='
  return b > a ? '▲' : '▼'
}

export function shareText(puzzle: string, date: string, rows: string[], solved: boolean, attempts: number): string {
  return `GeoKompass ${puzzle} ${date} · ${solved ? `${attempts}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`}\n${rows.join('\n')}`
}

export function entityLabel(e: Entity) {
  return e.names.de
}
