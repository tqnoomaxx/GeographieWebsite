// Größte Städte je Land aus Wikidata (Q515 Stadt, Q1549591 Großstadt, Q1637706 Millionenstadt, Q5119 Hauptstadt).
// Zweistufig: Kandidaten mit Einwohnerzahl ≥ MIN_POP, dann Details in Batches. Ergänzt entities/cities.json (Hauptstädte bleiben).
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { CACHE, DATA, readJson, writeJson, slugify, provenance, listDir } from './lib/common.mjs'
import { sparql, batched, qidOf } from './lib/wikidata.mjs'

const MIN_POP = 150_000
const PER_COUNTRY = 15
const cachePath = join(CACHE, 'wikidata-cities.json')

let rows
if (existsSync(cachePath) && !process.argv.includes('--refresh')) rows = readJson(cachePath)
else {
  const cands = await sparql(`SELECT DISTINCT ?item ?pop WHERE { VALUES ?cls { wd:Q515 wd:Q1549591 wd:Q1637706 wd:Q5119 wd:Q200250 } ?item wdt:P31 ?cls ; wdt:P1082 ?pop . FILTER(?pop >= ${MIN_POP}) } ORDER BY DESC(?pop) LIMIT 6000`)
  const best = new Map()
  for (const c of cands) {
    const q = qidOf(c.item.value)
    if (!best.has(q) || Number(c.pop.value) > best.get(q)) best.set(q, Number(c.pop.value))
  }
  rows = await batched([...best.keys()].map((q) => `wd:${q}`), (v) => `
SELECT ?item ?de ?en ?iso ?lat ?lon ?regionIso ?sl WHERE {
  VALUES ?item { ${v} }
  ?item wdt:P17 ?c . ?c wdt:P297 ?iso . ?item wikibase:sitelinks ?sl .
  OPTIONAL { ?item rdfs:label ?de FILTER(LANG(?de) = "de") }
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") }
  OPTIONAL { ?item p:P625/psv:P625 ?co . ?co wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon . }
  OPTIONAL { ?item wdt:P131 ?r1 . OPTIONAL { ?r1 wdt:P300 ?i1 } OPTIONAL { ?r1 wdt:P131 ?r2 . ?r2 wdt:P300 ?i2 } BIND(COALESCE(?i1, ?i2) AS ?regionIso) }
}`, 120, (i, n) => process.stdout.write(`Städte ${i}/${n}\r`))
  for (const r of rows) r.pop = best.get(qidOf(r.item.value))
  writeJson(cachePath, rows)
}

const countries = readJson(join(DATA, 'entities', 'countries.json'))
const countryByIso = new Map(countries.map((c) => [c.attributes.iso2, c]))
const regionIds = new Set(listDir(join(DATA, 'entities', 'regions')).flatMap((f) => readJson(join(DATA, 'entities', 'regions', f)).map((r) => r.id)))
const citiesPath = join(DATA, 'entities', 'cities.json')
const existing = readJson(citiesPath).filter((c) => c.provenance.source !== 'wikidata-cities')
const byKey = new Map(existing.map((c) => [`${c.attributes.country}|${c.names.de.toLowerCase()}`, c]))

const byQ = new Map()
for (const r of rows) {
  const q = qidOf(r.item.value)
  const cur = byQ.get(q) ?? { q, de: r.de?.value, en: r.en?.value, iso: r.iso.value, pop: r.pop, sl: Number(r.sl.value), lat: r.lat ? Number(r.lat.value) : undefined, lon: r.lon ? Number(r.lon.value) : undefined, regionIso: r.regionIso?.value }
  if (!cur.regionIso && r.regionIso) cur.regionIso = r.regionIso.value
  byQ.set(q, cur)
}
const perCountry = new Map()
for (const c of [...byQ.values()].sort((a, b) => b.pop - a.pop)) {
  if (!c.de || !countryByIso.has(c.iso)) continue
  const list = perCountry.get(c.iso) ?? []
  if (list.length >= PER_COUNTRY) continue
  if (list.some((x) => x.de === c.de)) continue
  list.push(c)
  perCountry.set(c.iso, list)
}
const relPath = join(DATA, 'relationships', 'index.json')
const relationships = readJson(relPath).filter((r) => !r.from.startsWith('city:') || existing.some((c) => c.id === r.from))
let added = 0
let enriched = 0
for (const [iso, list] of perCountry) {
  const country = countryByIso.get(iso)
  for (const c of list) {
    const key = `${country.id}|${c.de.toLowerCase()}`
    const regionId = c.regionIso && regionIds.has(`region:${c.regionIso}`) ? `region:${c.regionIso}` : undefined
    const hit = byKey.get(key)
    if (hit) {
      hit.attributes.population = c.pop
      hit.attributes.wikidata = c.q
      if (!hit.location && c.lat !== undefined) hit.location = { lat: c.lat, lon: c.lon }
      if (!hit.attributes.region && regionId) {
        hit.attributes.region = regionId
        relationships.push({ from: hit.id, to: regionId, type: 'located_in' })
      }
      if (c.en && !hit.names.en) hit.names.en = c.en
      enriched++
      continue
    }
    const id = `city:${iso}-${slugify(c.de)}`
    if (existing.some((e) => e.id === id)) continue
    const entity = {
      id, type: 'city', names: { de: c.de, en: c.en }, aliases: c.en && c.en !== c.de ? [c.en] : [],
      location: c.lat !== undefined ? { lat: c.lat, lon: c.lon } : undefined,
      media: [],
      attributes: { country: country.id, region: regionId, continent: country.attributes.continent, is_capital: false, population: c.pop, sitelinks: c.sl, wikidata: c.q },
      provenance: provenance('wikidata-cities', { source_id: c.q, license: 'CC0' }),
    }
    existing.push(entity)
    byKey.set(key, entity)
    relationships.push({ from: id, to: country.id, type: 'located_in' })
    if (regionId) relationships.push({ from: id, to: regionId, type: 'located_in' })
    added++
  }
}
existing.sort((a, b) => a.id.localeCompare(b.id))
writeJson(citiesPath, existing)
writeJson(relPath, relationships)
console.log(`Städte: ${added} neu, ${enriched} angereichert, gesamt ${existing.length} in ${perCountry.size} Ländern`)
