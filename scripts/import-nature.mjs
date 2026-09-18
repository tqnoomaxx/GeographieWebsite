// Gewässer und Berge aus Wikidata: Flüsse (Q4022), Seen (Q23397), Berge (Q8502), Vulkane (Q8072), Wüsten (Q8514), Inseln (Q23442).
// Auswahl über Bekanntheit (Anzahl Sitelinks), Länderzuordnung über P17. Erzeugt entities/rivers.json, lakes.json, mountains.json.
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { CACHE, DATA, readJson, writeJson, provenance } from './lib/common.mjs'

const UA = { Accept: 'application/sparql-results+json', 'User-Agent': 'GeoKompassImporter/0.1 (data import)' }
const TYPES = [
  { file: 'rivers', type: 'river', classes: ['Q4022', 'Q47521'], minLinks: 45, limit: 220, measure: 'P2043', measureKey: 'length_km', unitDiv: { Q11573: 1000, Q828224: 1 } },
  { file: 'lakes', type: 'lake', classes: ['Q23397'], minLinks: 40, limit: 140, measure: 'P2046', measureKey: 'area_km2', unitDiv: { Q712226: 1, Q35852: 100, Q25343: 1e6 } },
  { file: 'mountains', type: 'mountain', classes: ['Q8502', 'Q8072'], minLinks: 40, limit: 220, measure: 'P2044', measureKey: 'elevation_m', unitDiv: { Q11573: 1 } },
]

async function sparql(q, attempt = 1) {
  const res = await fetch('https://query.wikidata.org/sparql', { method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `query=${encodeURIComponent(q)}` })
  if (!res.ok) {
    if (attempt < 4 && res.status >= 500) {
      await new Promise((r) => setTimeout(r, 4000 * attempt))
      return sparql(q, attempt + 1)
    }
    throw new Error(`Wikidata ${res.status}`)
  }
  return (await res.json()).results.bindings
}

/** Schritt 1: Kandidaten nach Bekanntheit (billig). Schritt 2: Details in Batches von 80 QIDs. */
async function query(t) {
  const cachePath = join(CACHE, `wikidata-${t.file}.json`)
  if (!process.argv.includes('--refresh') && existsSync(cachePath)) return readJson(cachePath)
  const cands = await sparql(`SELECT ?item ?sl ?cls WHERE { VALUES ?cls { ${t.classes.map((c) => `wd:${c}`).join(' ')} } ?item wdt:P31 ?cls ; wikibase:sitelinks ?sl . FILTER(?sl >= ${t.minLinks}) } ORDER BY DESC(?sl) LIMIT ${t.limit * 2}`)
  const rows = []
  for (let i = 0; i < cands.length; i += 80) {
    const batch = cands.slice(i, i + 80)
    const values = batch.map((c) => `wd:${c.item.value.split('/').pop()}`).join(' ')
    const detail = await sparql(`
SELECT ?item ?de ?en ?lat ?lon ?amt ?unit (GROUP_CONCAT(DISTINCT ?iso; separator=",") AS ?isos) WHERE {
  VALUES ?item { ${values} }
  ?item wdt:P17 ?c . ?c wdt:P297 ?iso .
  OPTIONAL { ?item rdfs:label ?de FILTER(LANG(?de) = "de") }
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") }
  OPTIONAL { ?item p:P625/psv:P625 ?co . ?co wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon . }
  OPTIONAL { ?item p:${t.measure}/psv:${t.measure} ?m . ?m wikibase:quantityAmount ?amt ; wikibase:quantityUnit ?unit . }
} GROUP BY ?item ?de ?en ?lat ?lon ?amt ?unit`)
    const meta = new Map(batch.map((c) => [c.item.value, c]))
    for (const d of detail) rows.push({ ...d, sl: meta.get(d.item.value).sl, cls: meta.get(d.item.value).cls })
    process.stdout.write(`${t.file}: ${Math.min(i + 80, cands.length)}/${cands.length}\r`)
  }
  writeJson(cachePath, rows)
  return rows
}

const countries = readJson(join(DATA, 'entities', 'countries.json'))
const countryIds = new Set(countries.map((c) => c.id))
const continentOf = new Map(countries.map((c) => [c.id, c.attributes.continent]))
const relPath = join(DATA, 'relationships', 'index.json')
const relationships = readJson(relPath).filter((r) => !['flows_through'].includes(r.type) && !/^(river|lake|mountain):/.test(r.from))
const today = new Date().toISOString().slice(0, 10)

for (const t of TYPES) {
  let rows
  try {
    rows = await query(t)
  } catch (e) {
    console.warn(`${t.file}: ${e.message}; übersprungen`)
    continue
  }
  const byQ = new Map()
  for (const r of rows) {
    const qid = r.item.value.split('/').pop()
    const cur = byQ.get(qid) ?? { qid, de: r.de?.value, en: r.en?.value, sl: Number(r.sl.value), lat: r.lat ? Number(r.lat.value) : undefined, lon: r.lon ? Number(r.lon.value) : undefined, isos: new Set(), amt: undefined, volcano: false }
    for (const iso of (r.isos?.value ?? '').split(',').filter(Boolean)) cur.isos.add(iso)
    if (r.amt) {
      const div = t.unitDiv[r.unit.value.split('/').pop()]
      if (div) {
        const v = Math.round((Number(r.amt.value) / div) * 10) / 10
        if (cur.amt === undefined || v > cur.amt) cur.amt = v // bei mehreren Angaben die größte (z. B. Nil 6650 vs. 2850 km)
      }
    }
    if (r.cls?.value.endsWith('Q8072')) cur.volcano = true
    byQ.set(qid, cur)
  }
  const entities = []
  for (const w of [...byQ.values()].sort((a, b) => b.sl - a.sl)) {
    if (!w.de) continue
    const ids = [...w.isos].map((i) => `country:${i}`).filter((id) => countryIds.has(id))
    if (!ids.length) continue
    if (entities.length >= t.limit) break
    const id = `${t.type}:${w.qid}`
    const primary = ids[0]
    entities.push({
      id,
      type: t.type,
      names: { de: w.de, en: w.en },
      aliases: w.en && w.en !== w.de ? [w.en] : [],
      location: w.lat !== undefined ? { lat: w.lat, lon: w.lon } : undefined,
      attributes: {
        country: ids.length === 1 ? primary : undefined,
        countries: ids,
        continent: continentOf.get(primary),
        [t.measureKey]: w.amt,
        sitelinks: w.sl,
        kind: w.volcano ? 'volcano' : t.type,
        wikidata: w.qid,
      },
      provenance: provenance('wikidata', { source_id: w.qid, license: 'CC0', last_updated: today }),
    })
    for (const c of ids) relationships.push({ from: id, to: c, type: t.type === 'river' ? 'flows_through' : 'located_in' })
  }
  writeJson(join(DATA, 'entities', `${t.file}.json`), entities)
  console.log(`${t.file}: ${entities.length}`)
}
writeJson(relPath, relationships)
