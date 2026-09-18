// Import des Altbestands aus ugbzspiele: Regionalflaggen, Regionen, Städte, Sehenswürdigkeiten, Bildlizenzen.
// Voraussetzung: import-countries.mjs ist gelaufen (Länder-IDs).
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { DATA, PUBLIC, readJson, writeJson, slugify, provenance, parseAttribution, attributionText } from './lib/common.mjs'

const { flagCatalog } = await import('./legacy/catalog.generated.js')
const geo = await import('./legacy/geographyCatalog.js')

const countries = readJson(join(DATA, 'entities', 'countries.json'))
const countryByName = new Map(countries.map((c) => [c.names.de, c]))
const countryByIso = new Map(countries.map((c) => [c.attributes.iso2, c]))
// Legacy-Namen, die vom mledoze-Deutsch abweichen
const NAME_FIX = { Tschechien: 'Tschechien', Belarus: 'Weißrussland', 'Vereinigtes Königreich': 'Vereinigtes Königreich' }
function countryFor(nameOrIso) {
  return countryByIso.get(nameOrIso) ?? countryByName.get(nameOrIso) ?? countryByName.get(NAME_FIX[nameOrIso])
}

const photoAttribution = parseAttribution(readFileSync(join(PUBLIC, 'media/photos/ATTRIBUTION-legacy.md'), 'utf8'))
const mapIsos = new Set((await import('node:fs')).readdirSync(join(PUBLIC, 'media/maps/regions')).filter((f) => f.endsWith('.json')).map((f) => f.split('-')[0]))
const hasMap = (iso2) => mapIsos.has(iso2)
const europeIds = new Set((existsSync(join(PUBLIC, 'media/maps/regions/europe.json')) ? readJson(join(PUBLIC, 'media/maps/regions/europe.json')).shapes : []).map((s) => s.flagId))
const relationships = []
const rel = (from, to, type) => relationships.push({ from, to, type })

// ---- Regionen aus dem Flaggenkatalog
const regionsByCountry = new Map()
const regionalCapitals = new Map(geo.regionalCapitalCatalog.map((r) => [r.regionFlagId, r]))
let regionCount = 0
for (const f of flagCatalog.filter((x) => x.kind === 'region')) {
  const iso2 = f.code.split('-')[0]
  const country = countryByIso.get(iso2)
  if (!country) {
    console.warn(`kein Land für Region ${f.code}`)
    continue
  }
  const id = `region:${f.code}`
  const cap = regionalCapitals.get(f.id)
  const entity = {
    id,
    type: 'region',
    names: { de: f.name },
    aliases: [],
    media: [
      {
        id: `media:flag:${f.code}`,
        kind: 'flag',
        url: f.image.replace('/assets/flags/', 'media/flags/'),
        source: 'niemela/flags via ugbzspiele',
        source_url: f.source,
        license: 'mixed (siehe Quellseite; Metadaten CC BY-SA 4.0)',
        attribution: `Quelle: ${f.source}`,
      },
    ],
    attributes: {
      code: f.code,
      country: country.id,
      admin_level: 1,
      collection: f.collection,
      continent: f.continent,
      capital_name: cap?.name,
      visual_key: f.visualKey,
      europe_map: europeIds.has(f.id) || undefined,
      map: hasMap(iso2) ? `media/maps/regions/${iso2}` : undefined,
    },
    provenance: provenance('ugbzspiele', { source_url: f.source }),
  }
  rel(id, country.id, 'located_in')
  if (!regionsByCountry.has(iso2)) regionsByCountry.set(iso2, [])
  regionsByCountry.get(iso2).push(entity)
  regionCount++
}
for (const [iso2, list] of regionsByCountry) {
  list.sort((a, b) => a.id.localeCompare(b.id))
  writeJson(join(DATA, 'entities', 'regions', `${iso2}.json`), list)
}

// ---- Städte (Hauptstädte, weitere Städte, Regionalhauptstädte)
const cities = new Map()
function cityId(iso2, name) {
  return `city:${iso2}-${slugify(name)}`
}
for (const c of geo.cityCatalog) {
  const country = countryByIso.get(c.countryCode)
  if (!country) continue
  const id = cityId(c.countryCode, c.name)
  const media = []
  if (c.image) {
    const file = c.image.replace('/assets/geography/cities/', 'media/photos/cities/')
    const attr = photoAttribution.get(`${c.name} (${c.parent})`)
    if (existsSync(join(PUBLIC, file)) && attr) {
      media.push({
        id: `media:photo:${id}`,
        kind: 'photo',
        url: file,
        source: 'wikimedia-commons',
        source_url: attr.source_url,
        author: attr.author,
        license: attr.license,
        license_url: attr.license_url,
        attribution: attributionText(attr),
        caption: c.wikipediaTitle,
      })
    }
  }
  cities.set(id, {
    id,
    type: 'city',
    names: { de: c.name },
    aliases: [],
    media,
    attributes: { country: country.id, continent: c.continent, is_capital: c.capital },
    provenance: provenance('ugbzspiele'),
  })
  rel(id, country.id, 'located_in')
  if (c.capital) rel(id, country.id, 'capital_of')
}
for (const r of geo.regionalCapitalCatalog) {
  const iso2 = r.regionFlagId.replace('region-', '').split('-')[0]
  const regionId = r.regionFlagId.replace('region-', 'region:')
  const country = countryByIso.get(iso2)
  if (!country) continue
  const id = cityId(iso2, r.name)
  if (!cities.has(id)) {
    cities.set(id, {
      id,
      type: 'city',
      names: { de: r.name },
      aliases: [],
      media: [],
      attributes: { country: country.id, continent: r.continent, is_capital: false },
      provenance: provenance('ugbzspiele'),
    })
    rel(id, country.id, 'located_in')
  }
  cities.get(id).attributes.region = regionId
  rel(id, regionId, 'located_in')
  rel(id, regionId, 'capital_of')
}
const cityList = [...cities.values()].sort((a, b) => a.id.localeCompare(b.id))
writeJson(join(DATA, 'entities', 'cities.json'), cityList)

// Hauptstadt-Referenz in Ländern setzen (city id), wenn der Name übereinstimmt
for (const country of countries) {
  const names = country.attributes.capital_names ?? []
  const match = cityList.find((c) => c.attributes.country === country.id && c.attributes.is_capital)
  if (match) country.attributes.capital = match.id
  else if (names.length) {
    // Hauptstadt aus mledoze anlegen, damit jedes Land eine Hauptstadt-Entity besitzt
    const id = cityId(country.attributes.iso2, names[0])
    if (!cities.has(id)) {
      const city = {
        id,
        type: 'city',
        names: { de: names[0] },
        aliases: [],
        media: [],
        attributes: { country: country.id, continent: country.attributes.continent, is_capital: true },
        provenance: provenance('mledoze/countries', { license: 'ODbL-1.0' }),
      }
      cities.set(id, city)
      cityList.push(city)
      rel(id, country.id, 'located_in')
      rel(id, country.id, 'capital_of')
    }
    country.attributes.capital = id
  }
}
cityList.sort((a, b) => a.id.localeCompare(b.id))
writeJson(join(DATA, 'entities', 'cities.json'), cityList)
writeJson(join(DATA, 'entities', 'countries.json'), countries)

// ---- Sehenswürdigkeiten
const landmarks = []
for (const l of geo.landmarkCatalog) {
  const country = countryByIso.get(l.countryCode)
  if (!country) continue
  const file = l.image.replace('/assets/geography/landmarks/', 'media/photos/landmarks/')
  const attr = photoAttribution.get(l.name)
  if (!existsSync(join(PUBLIC, file)) || !attr) {
    console.warn(`Sehenswürdigkeit ohne Bild/Lizenz übersprungen: ${l.name}`)
    continue
  }
  const id = `landmark:${l.id.replace('landmark-', '')}`
  landmarks.push({
    id,
    type: 'landmark',
    names: { de: l.name, en: l.wikipediaTitle },
    aliases: [l.unescoName].filter((a) => a && a !== l.name),
    media: [
      {
        id: `media:photo:${id}`,
        kind: 'photo',
        url: file,
        source: 'wikimedia-commons',
        source_url: attr.source_url,
        author: attr.author,
        license: attr.license,
        license_url: attr.license_url,
        attribution: attributionText(attr),
      },
    ],
    attributes: {
      country: country.id,
      continent: l.continent,
      place_name: l.city,
      unesco: l.unescoName,
      landmark_type: 'unesco',
    },
    provenance: provenance('ugbzspiele', { source_url: `https://${l.wikiLanguage}.wikipedia.org/wiki/${encodeURIComponent(l.wikipediaTitle)}` }),
  })
  rel(id, country.id, 'located_in')
  const cityMatch = cityList.find((c) => c.attributes.country === country.id && c.names.de === l.city)
  if (cityMatch) rel(id, cityMatch.id, 'located_in')
}
landmarks.sort((a, b) => a.id.localeCompare(b.id))
writeJson(join(DATA, 'entities', 'landmarks.json'), landmarks)

// ---- Nachbarschaft aus Länderdaten
for (const c of countries) for (const b of c.attributes.borders ?? []) rel(c.id, b, 'neighbor_of')

writeJson(join(DATA, 'relationships', 'index.json'), relationships)
console.log(`Regionen: ${regionCount} in ${regionsByCountry.size} Ländern, Städte: ${cityList.length}, Sehenswürdigkeiten: ${landmarks.length}, Beziehungen: ${relationships.length}`)
