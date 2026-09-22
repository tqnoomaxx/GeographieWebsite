// Deutsche Kfz-Unterscheidungszeichen aus Wikidata (P395) für aktuelle Landkreise/kreisfreie Städte (P440, nicht aufgelöst).
// Erzeugt data/entities/license-plates/DE.json. Andere Länder folgen demselben Schema.
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { CACHE, DATA, readJson, writeJson, provenance } from './lib/common.mjs'

const COUNTRIES = {
  DE: { qid: 'Q183', extra: '; wdt:P440 ?key', stateClass: 'wd:Q1221156', cityStates: { B: 'DE-BE', HH: 'DE-HH', HB: 'DE-HB' } },
  AT: { qid: 'Q40', extra: '; wdt:P31 ?cls . FILTER(?cls IN (wd:Q871419, wd:Q262882, wd:Q1741))', stateClass: 'wd:Q261543', cityStates: { W: 'AT-9' } },
  CH: { qid: 'Q39', extra: '; wdt:P31 ?cls . FILTER(?cls IN (wd:Q23058))', stateClass: 'wd:Q23058', cityStates: {} },
}
const iso2 = process.argv.find((a) => /^[A-Z]{2}$/.test(a)) ?? 'DE'
const C = COUNTRIES[iso2]
const QUERY = `
SELECT ?item ?itemLabel ?code ?stateIso ?lat ?lon WHERE {
  ?item wdt:P395 ?code ; wdt:P17 wd:${C.qid} ${C.extra} .
  FILTER NOT EXISTS { ?item wdt:P576 ?dissolved }
  OPTIONAL { ?item wdt:P300 ?ownIso . FILTER(STRSTARTS(?ownIso, "${iso2}-")) }
  OPTIONAL { ?item wdt:P131 ?s1 . OPTIONAL { ?s1 wdt:P300 ?i1 . FILTER(STRSTARTS(?i1, "${iso2}-")) } OPTIONAL { ?s1 wdt:P131 ?s2 . ?s2 wdt:P300 ?i2 . FILTER(STRSTARTS(?i2, "${iso2}-")) } }
  BIND(COALESCE(?ownIso, ?i1, ?i2) AS ?stateIso)
  OPTIONAL { ?item p:P625/psv:P625 ?c . ?c wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de". }
}`
const cachePath = join(CACHE, `wikidata-plates-${iso2}.json`)
let rows
if (!process.argv.includes('--refresh') && existsSync(cachePath)) rows = readJson(cachePath)
else {
  const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(QUERY)}`, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'AtlasfunkeImporter/0.1 (data import)' },
  })
  if (!res.ok) {
    console.warn(`Wikidata nicht erreichbar (${res.status}); überspringe Kennzeichen.`)
    process.exit(0)
  }
  rows = (await res.json()).results.bindings
  writeJson(cachePath, rows)
}

// Stadtstaaten: Berlin, Hamburg, Bremen sind selbst Bundesländer
const CITY_STATES = C.cityStates
const regionsPath = join(DATA, 'entities', 'regions', `${iso2}.json`)
const regionIds = new Set(existsSync(regionsPath) ? readJson(regionsPath).map((r) => r.id) : [])

const byCode = new Map()
for (const r of rows) {
  const code = r.code.value.trim().toUpperCase()
  if (!/^[A-ZÄÖÜ]{1,3}$/.test(code)) continue
  if (iso2 === 'CH' && !r.stateIso) continue
  const label = r.itemLabel.value
  const stateIso = r.stateIso?.value ?? CITY_STATES[code]
  const cur = byCode.get(code) ?? { code, districts: new Map(), qids: new Set(), stateIso, lat: undefined, lon: undefined }
  cur.districts.set(r.item.value.split('/').pop(), label)
  cur.qids.add(r.item.value.split('/').pop())
  if (!cur.stateIso && stateIso) cur.stateIso = stateIso
  if (!cur.lat && r.lat) {
    cur.lat = Number(r.lat.value)
    cur.lon = Number(r.lon.value)
  }
  byCode.set(code, cur)
}

const clean = (s) => s.replace(/^(Landkreis|Kreis|Stadtkreis|Region|Regionalverband|Städteregion|Bezirk|Kanton|Statutarstadt) /, '').replace(/ \((Land|Stadt)\)$/, '').replace(/^kreisfreie Stadt /i, '')
const plates = []
for (const p of [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code))) {
  const names = [...p.districts.values()]
  const primary = names.find((n) => !/^(Landkreis|Kreis) /.test(n)) ?? names[0]
  const regionId = p.stateIso ? `region:${p.stateIso}` : undefined
  plates.push({
    id: `license_plate:${iso2}-${p.code.replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE')}`,
    type: 'license_plate',
    names: { de: clean(primary) },
    aliases: [...new Set(names.flatMap((n) => [n, clean(n)]))].filter((n) => n !== clean(primary)),
    location: p.lat ? { lat: p.lat, lon: p.lon } : undefined,
    attributes: {
      code: p.code,
      country: `country:${iso2}`,
      region: regionId && regionIds.has(regionId) ? regionId : undefined,
      districts: names,
      historical: false,
    },
    provenance: provenance('wikidata', { source_id: [...p.qids][0], license: 'CC0' }),
  })
}
writeJson(join(DATA, 'entities', 'license-plates', `${iso2}.json`), plates)
const noRegion = plates.filter((p) => !p.attributes.region).length
console.log(`Kennzeichen ${iso2}: ${plates.length} (${noRegion} ohne Bundesland)`)
