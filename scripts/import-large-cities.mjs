// Vollständiger GeoNames-Auszug oberhalb 300.000 Einwohnern, ohne Limit je Land.
// Stadtteile sowie historische/aufgegebene Orte zählen nicht als eigene Städte.
import { existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { CACHE, DATA, readJson, writeJson, provenance } from './lib/common.mjs'

const sourceUrl = 'https://download.geonames.org/export/dump/cities15000.zip'
const archive = join(CACHE, 'geonames-cities15000.zip')
if (!existsSync(archive) || process.argv.includes('--refresh')) {
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error(`GeoNames: HTTP ${response.status}`)
  mkdirSync(CACHE, { recursive: true })
  writeFileSync(archive, Buffer.from(await response.arrayBuffer()))
}
const text = execFileSync('unzip', ['-p', archive, 'cities15000.txt'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
})
const countries = readJson(join(DATA, 'entities/countries.json'))
const countryByIso = new Map(countries.map((c) => [c.attributes.iso2, c]))
const citiesPath = join(DATA, 'entities/cities.json')
const cities = readJson(citiesPath)
const relationshipsPath = join(DATA, 'relationships/index.json')
const relationships = readJson(relationshipsPath)
const normalize = (value) =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
const namesOf = (city) =>
  [city.names.de, city.names.en, ...(city.aliases ?? [])].filter(Boolean).map(normalize)
const distance = (a, b) => {
  if (!a || !b) return Infinity
  const rad = Math.PI / 180
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)))
}
const existingByCountry = new Map()
for (const city of cities) {
  const list = existingByCountry.get(city.attributes.country) ?? []
  list.push(city)
  existingByCountry.set(city.attributes.country, list)
  // Entfernt veraltete Schwellenwert-Zugehörigkeit bei einem erneuten Import.
  if ('geonames_population' in city.attributes) city.attributes.geonames_population = undefined
}
const rows = text
  .trimEnd()
  .split('\n')
  .map((line) => line.split('\t'))
  .filter((r) => r[6] === 'P' && !['PPLX', 'PPLH', 'PPLQ', 'PPLW'].includes(r[7]) && Number(r[14]) > 300_000)
const used = new Set()
const counts = {}
let added = 0
for (const row of rows) {
  const [geonameId, name, ascii, alternatives, lat, lon, , feature, iso] = row
  const country = countryByIso.get(iso)
  if (!country) throw new Error(`Unbekanntes Land für ${name}: ${iso}`)
  const population = Number(row[14])
  const location = { lat: Number(lat), lon: Number(lon) }
  const aliases = new Set([name, ascii, ...alternatives.split(',')].map(normalize))
  const candidates = (existingByCountry.get(country.id) ?? []).filter((city) => !used.has(city.id))
  const named = candidates.filter((city) => namesOf(city).some((n) => aliases.has(n)))
  let city =
    candidates.find((c) => String(c.attributes.geonames) === geonameId) ??
    named
      .filter((c) => !c.location || distance(c.location, location) < 50)
      .sort((a, b) => distance(a.location, location) - distance(b.location, location))[0] ??
    candidates
      .filter((c) => distance(c.location, location) < 3)
      .sort((a, b) => distance(a.location, location) - distance(b.location, location))[0]
  const source = {
    source: 'GeoNames',
    source_id: geonameId,
    source_url: `https://www.geonames.org/${geonameId}/`,
    imported_at: new Date().toISOString().slice(0, 10),
  }
  if (!city) {
    city = {
      id: `city:geonames-${geonameId}`,
      type: 'city',
      names: { de: name, en: ascii || name },
      aliases: [...new Set([name, ascii])].filter((n) => n && n !== name),
      location,
      media: [],
      attributes: {
        country: country.id,
        continent: country.attributes.continent,
        population,
        is_capital: feature === 'PPLC',
      },
      provenance: provenance('GeoNames', {
        source_id: geonameId,
        source_url: source.source_url,
        license: 'CC BY 4.0',
        last_updated: row[18],
      }),
    }
    cities.push(city)
    relationships.push({ from: city.id, to: country.id, type: 'located_in' })
    added++
  }
  used.add(city.id)
  city.attributes.geonames = geonameId
  city.attributes.geonames_population = population
  city.attributes.geonames_modified = row[18]
  city.location ??= location
  city.provenance.fields = { ...city.provenance.fields, geonames_population: source }
  const continent = city.attributes.continent ?? country.attributes.continent
  counts[continent] = (counts[continent] ?? 0) + 1
}
cities.sort((a, b) => a.id.localeCompare(b.id))
writeJson(citiesPath, cities)
writeJson(relationshipsPath, relationships)
console.log(`GeoNames >300.000: ${used.size} Städte (${added} neu), ${JSON.stringify(counts)}`)
