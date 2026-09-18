import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const DATA = join(ROOT, 'public', 'data')
export const CACHE = join(ROOT, 'scripts', '.cache')
export const PUBLIC = join(ROOT, 'public')

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 1) + '\n')
}

export function listDir(path) {
  return existsSync(path) ? readdirSync(path) : []
}

export function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function provenance(source, extra = {}) {
  return { source, imported_at: new Date().toISOString().slice(0, 10), ...extra }
}

export const CONTINENTS = {
  europe: { de: 'Europa', en: 'Europe' },
  asia: { de: 'Asien', en: 'Asia' },
  africa: { de: 'Afrika', en: 'Africa' },
  'north-america': { de: 'Nordamerika', en: 'North America' },
  'south-america': { de: 'Südamerika', en: 'South America' },
  oceania: { de: 'Ozeanien', en: 'Oceania' },
  antarctica: { de: 'Antarktis', en: 'Antarctica' },
}

/** Rundet Koordinaten einer GeoJSON-Geometrie rekursiv. */
export function roundCoords(coords, digits) {
  if (typeof coords[0] === 'number') return coords.map((n) => Number(n.toFixed(digits)))
  return coords.map((c) => roundCoords(c, digits))
}

/**
 * Parst die Legacy-Attribution-Markdown:
 * - **Name:** [Bildbeschreibung](url) · Autor · Lizenz ([Lizenz](url))
 * - **Name:** [Bildbeschreibung](url) · Autor · Public domain
 */
export function parseAttribution(markdown) {
  const map = new Map()
  const re = /^- \*\*(.+?):\*\* \[Bildbeschreibung\]\((.+?)\) · (.+?) · (.+?)(?: \(\[Lizenz\]\((.+?)\)\))?$/gmu
  for (const m of markdown.matchAll(re)) {
    const [, name, source_url, author, license, license_url] = m
    map.set(name.trim(), { source_url, author: author.trim(), license: license.trim(), license_url })
  }
  return map
}

export function attributionText({ author, license, source_url }) {
  return `${author} · ${license} · ${source_url}`
}
