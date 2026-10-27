// A country-split gazetteer for free city recall. Other quiz pools stay unchanged.
import { existsSync, mkdirSync, statSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { CACHE, DATA, readJson, writeJson } from './lib/common.mjs'
const source = 'https://download.geonames.org/export/dump/cities15000.zip'
const archive = join(CACHE, 'geonames-cities15000.zip')
if (!existsSync(archive) || process.argv.includes('--refresh')) {
  const response = await fetch(source)
  if (!response.ok) throw new Error('GeoNames: HTTP ' + response.status)
  mkdirSync(CACHE, { recursive: true })
  writeFileSync(archive, Buffer.from(await response.arrayBuffer()))
}
const rows = execFileSync('unzip', ['-p', archive, 'cities15000.txt'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
})
  .trimEnd()
  .split('\n')
  .map((line) => line.split('\t'))
const countries = readJson(join(DATA, 'entities/countries.json'))
const countryByIso = new Map(countries.map((c) => [c.attributes.iso2, c]))
const existing = readJson(join(DATA, 'entities/cities.json'))
const byGeo = new Map(
  existing.filter((c) => c.attributes.geonames).map((c) => [String(c.attributes.geonames), c]),
)
const normalize = (s) =>
  s
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
const byName = new Map()
for (const city of existing)
  for (const name of [city.names.de, city.names.en, ...(city.aliases ?? [])].filter(Boolean)) {
    const key = city.attributes.country + ':' + normalize(name)
    const list = byName.get(key) ?? []
    list.push(city)
    byName.set(key, list)
  }
const used = new Set(),
  grouped = new Map()
for (const row of rows) {
  if (row[6] !== 'P' || ['PPLX', 'PPLH', 'PPLQ', 'PPLW'].includes(row[7]) || Number(row[14]) <= 15000)
    continue
  const [geonameId, name, ascii, alternatives, lat, lon, , , iso] = row
  const country = countryByIso.get(iso)
  if (!country) throw new Error('Unbekanntes Land: ' + iso)
  const latitude = Number(lat),
    longitude = Number(lon),
    population = Number(row[14])
  if (
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180 ||
    !Number.isSafeInteger(population)
  )
    throw new Error('Ungültiger GeoNames-Eintrag: ' + geonameId)
  const names = [name, ascii, ...alternatives.split(',')].filter(Boolean)
  const candidates = [...new Set(names.flatMap((n) => byName.get(country.id + ':' + normalize(n)) ?? []))]
  const match =
    byGeo.get(geonameId) ??
    candidates.find(
      (c) =>
        !c.attributes.geonames &&
        !used.has(c.id) &&
        c.location &&
        Math.abs(c.location.lat - latitude) < 0.03 &&
        Math.abs(c.location.lon - longitude) < 0.03,
    )
  const id = match?.id ?? 'city:geonames-' + geonameId
  if (used.has(id)) throw new Error('Doppelte Stadt: ' + id)
  used.add(id)
  const label = match?.names.de ?? name
  const aliases = [
    ...new Set([...names, match?.names.en, ...(match?.aliases ?? [])].filter((n) => n && n !== label)),
  ]
  const item = { id, name: label, aliases, lat: latitude, lon: longitude, population, geonameId }
  const list = grouped.get(country.id) ?? []
  list.push(item)
  grouped.set(country.id, list)
}
const index = {
  minimumPopulation: 15000,
  snapshotDate: statSync(archive).mtime.toISOString().slice(0, 10),
  source,
  license: 'CC BY 4.0',
  countries: {},
}
for (const [id, cities] of [...grouped].sort(([a], [b]) => a.localeCompare(b))) {
  const iso = id.replace('country:', '')
  cities.sort((a, b) => b.population - a.population || a.id.localeCompare(b.id))
  const file = 'city-recall/' + iso + '.json'
  writeJson(join(DATA, file), { country: id, cities })
  index.countries[id] = {
    file,
    populations: cities.map((c) => c.population),
    hasOutline: existsSync(join(DATA, 'geo/outlines', iso + '.json')),
  }
}
for (const file of readdirSync(join(DATA, 'city-recall'))) {
  if (/^[A-Z]{2}\.json$/.test(file) && !index.countries['country:' + file.slice(0, 2)])
    unlinkSync(join(DATA, 'city-recall', file))
}
writeJson(join(DATA, 'city-recall/index.json'), index)
console.log(
  `Städte-Ratespiel: ${used.size} Städte über 15.000 Einwohnern in ${grouped.size} Ländern/Gebieten.`,
)
