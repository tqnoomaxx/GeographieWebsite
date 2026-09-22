// Anreicherung der Länder mit Wikidata: Einwohnerzahl (P1082), höchster Punkt (P610), Wikidata-QID.
// Läuft nur, wenn Netzwerk verfügbar ist; ohne Netz bleiben bestehende Werte erhalten.
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { CACHE, DATA, readJson, writeJson } from './lib/common.mjs'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const QUERY = `
SELECT ?iso ?item ?pop ?peak ?peakLabel ?elev WHERE {
  ?item wdt:P297 ?iso .
  OPTIONAL { ?item wdt:P1082 ?pop . }
  OPTIONAL { ?item wdt:P610 ?peak . OPTIONAL { ?peak wdt:P2044 ?elev . } }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
}`

const cachePath = join(CACHE, 'wikidata-countries.json')
let rows
const force = process.argv.includes('--refresh')
if (!force && existsSync(cachePath)) rows = readJson(cachePath)
else {
  try {
    const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(QUERY)}`, {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'AtlasfunkeImporter/0.1 (data import; contact via repository)' },
    })
    if (!res.ok) throw new Error(`Wikidata ${res.status}`)
    rows = (await res.json()).results.bindings
    writeJson(cachePath, rows)
  } catch (err) {
    console.warn(`Wikidata nicht erreichbar (${err.message}); überspringe Anreicherung.`)
    process.exit(0)
  }
}

const byIso = new Map()
for (const r of rows) {
  const iso = r.iso.value
  const cur = byIso.get(iso) ?? { qid: r.item.value.split('/').pop(), pops: [], peaks: [] }
  if (r.pop) cur.pops.push(Number(r.pop.value))
  if (r.peak) cur.peaks.push({ qid: r.peak.value.split('/').pop(), name: r.peakLabel?.value, elevation_m: r.elev ? Number(r.elev.value) : undefined })
  byIso.set(iso, cur)
}

const path = join(DATA, 'entities', 'countries.json')
const countries = readJson(path)
let enriched = 0
const today = new Date().toISOString().slice(0, 10)
for (const c of countries) {
  const w = byIso.get(c.attributes.iso2)
  if (!w) continue
  c.attributes.wikidata = w.qid
  const pops = [...new Set(w.pops)]
  if (pops.length) {
    c.attributes.population = Math.max(...pops)
    c.provenance.fields = { ...c.provenance.fields, population: { source: 'wikidata', source_id: w.qid, imported_at: today } }
    if (pops.length > 1) {
      c.provenance.conflicts = [
        ...(c.provenance.conflicts ?? []).filter((x) => x.field !== 'population'),
        { field: 'population', values: pops.map((v) => ({ source: 'wikidata', value: v })) },
      ]
    }
    enriched++
  }
  const peak = w.peaks.find((p) => p.name)
  if (peak) {
    c.attributes.highest_point = { name: peak.name, elevation_m: peak.elevation_m, wikidata: peak.qid }
    c.provenance.fields = { ...c.provenance.fields, highest_point: { source: 'wikidata', source_id: peak.qid, imported_at: today } }
  }
}
writeJson(path, countries)
console.log(`Wikidata: ${enriched} Länder mit Einwohnerzahl angereichert`)
