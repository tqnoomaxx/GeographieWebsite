// Deutsche Kfz-Unterscheidungszeichen aus Wikidata (P395) für aktuelle Landkreise/kreisfreie Städte (P440, nicht aufgelöst).
// Erzeugt data/entities/license-plates/DE.json. Andere Länder folgen demselben Schema.
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { CACHE, DATA, readJson, writeJson, provenance } from './lib/common.mjs'

const QUERY = `
SELECT ?item ?itemLabel ?code ?key ?stateIso ?lat ?lon WHERE {
  ?item wdt:P395 ?code ; wdt:P440 ?key ; wdt:P17 wd:Q183 .
  FILTER NOT EXISTS { ?item wdt:P576 ?dissolved }
  OPTIONAL { ?item wdt:P131* ?state . ?state wdt:P31 wd:Q1221156 ; wdt:P300 ?stateIso . }
  OPTIONAL { ?item p:P625/psv:P625 ?c . ?c wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de". }
}`
const cachePath = join(CACHE, 'wikidata-plates-DE.json')
let rows
if (!process.argv.includes('--refresh') && existsSync(cachePath)) rows = readJson(cachePath)
else {
  const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(QUERY)}`, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'GeoKompassImporter/0.1 (data import)' },
  })
  if (!res.ok) {
    console.warn(`Wikidata nicht erreichbar (${res.status}); überspringe Kennzeichen.`)
    process.exit(0)
  }
  rows = (await res.json()).results.bindings
  writeJson(cachePath, rows)
}

// Stadtstaaten: Berlin, Hamburg, Bremen sind selbst Bundesländer
const CITY_STATES = { B: 'DE-BE', HH: 'DE-HH', HB: 'DE-HB' }
const regionsPath = join(DATA, 'entities', 'regions', 'DE.json')
const regionIds = new Set(existsSync(regionsPath) ? readJson(regionsPath).map((r) => r.id) : [])

const byCode = new Map()
for (const r of rows) {
  const code = r.code.value.trim().toUpperCase()
  if (!/^[A-ZÄÖÜ]{1,3}$/.test(code)) continue
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

const clean = (s) => s.replace(/^(Landkreis|Kreis|Stadtkreis|Region|Regionalverband|Städteregion) /, '').replace(/^kreisfreie Stadt /i, '')
const plates = []
for (const p of [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code))) {
  const names = [...p.districts.values()]
  const primary = names.find((n) => !/^(Landkreis|Kreis) /.test(n)) ?? names[0]
  const regionId = p.stateIso ? `region:${p.stateIso}` : undefined
  plates.push({
    id: `license_plate:DE-${p.code.replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE')}`,
    type: 'license_plate',
    names: { de: clean(primary) },
    aliases: [...new Set(names.flatMap((n) => [n, clean(n)]))].filter((n) => n !== clean(primary)),
    location: p.lat ? { lat: p.lat, lon: p.lon } : undefined,
    attributes: {
      code: p.code,
      country: 'country:DE',
      region: regionId && regionIds.has(regionId) ? regionId : undefined,
      districts: names,
      historical: false,
    },
    provenance: provenance('wikidata', { source_id: [...p.qids][0], license: 'CC0' }),
  })
}
writeJson(join(DATA, 'entities', 'license-plates', 'DE.json'), plates)
const noRegion = plates.filter((p) => !p.attributes.region).length
console.log(`Kennzeichen DE: ${plates.length} (${noRegion} ohne Bundesland)`)
