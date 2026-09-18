// Import der Länderstammdaten aus mledoze/countries (ODbL 1.0) und der Umrisse aus Natural Earth (Public Domain).
// Idempotent: erzeugt data/entities/countries.json, data/geo/world.json, data/geo/outlines/<CC>.json neu.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { CACHE, DATA, PUBLIC, readJson, writeJson, provenance, roundCoords, CONTINENTS } from './lib/common.mjs'

const SOURCES = {
  countries: 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json',
  ne110: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
  ne50: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson',
}

async function cached(name, url) {
  const path = join(CACHE, name)
  if (!existsSync(path)) {
    console.log(`lade ${url}`)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url}: ${res.status}`)
    writeJson(path, await res.json())
  }
  return readJson(path)
}

function continentOf(c) {
  if (c.region === 'Europe') return 'europe'
  if (c.region === 'Asia') return 'asia'
  if (c.region === 'Africa') return 'africa'
  if (c.region === 'Oceania') return 'oceania'
  if (c.region === 'Antarctic') return 'antarctica'
  if (c.region === 'Americas') return c.subregion === 'South America' ? 'south-america' : 'north-america'
  return undefined
}

const LEGACY_CONTINENT = { 'north-america': 'north-america', 'south-america': 'south-america' }

const raw = await cached('countries.json', SOURCES.countries)
const ne110 = await cached('ne110.geojson', SOURCES.ne110)
const ne50 = await cached('ne50.geojson', SOURCES.ne50)

// Legacy-Katalog liefert deutsche Namen für Gebiete, die mledoze nicht kennt, und den Flaggenbestand.
const { flagCatalog } = await import('./legacy/catalog.generated.js')
const legacyCountries = new Map(flagCatalog.filter((f) => f.kind === 'country').map((f) => [f.code, f]))

const byCca3 = new Map(raw.map((c) => [c.cca3, c]))
const countries = []

for (const c of raw) {
  const iso2 = c.cca2
  const flagFile = `media/flags/countries/${iso2}.svg`
  const hasFlag = existsSync(join(PUBLIC, flagFile))
  const legacy = legacyCountries.get(iso2)
  const nameDe = c.translations?.deu?.common ?? legacy?.name ?? c.name.common
  const aliases = new Set([c.name.common, c.name.official, c.translations?.deu?.official, ...(c.altSpellings ?? [])])
  aliases.delete(nameDe)
  const entity = {
    id: `country:${iso2}`,
    type: 'country',
    names: { de: nameDe, en: c.name.common },
    aliases: [...aliases].filter(Boolean),
    location: c.latlng?.length === 2 ? { lat: c.latlng[0], lon: c.latlng[1] } : undefined,
    geometry: `geo/outlines/${iso2}.json`,
    media: hasFlag
      ? [
          {
            id: `media:flag:${iso2}`,
            kind: 'flag',
            url: flagFile,
            source: 'country-flag-icons 1.6.20',
            source_url: 'https://github.com/catamphetamine/country-flag-icons',
            license: 'MIT',
            attribution: 'country-flag-icons (MIT)',
          },
        ]
      : [],
    attributes: {
      iso2,
      iso3: c.cca3,
      continent: continentOf(c) ?? LEGACY_CONTINENT[legacy?.continent] ?? legacy?.continent,
      subregion: c.subregion || undefined,
      capital_names: c.capital?.length ? c.capital : undefined,
      area_km2: c.area > 0 ? c.area : undefined,
      currencies: Object.entries(c.currencies ?? {}).map(([code, v]) => ({ code, name: v.name, symbol: v.symbol })),
      languages: Object.values(c.languages ?? {}),
      tld: c.tld?.length ? c.tld : undefined,
      calling_code: c.idd?.root ? `${c.idd.root}${c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : ''}` : undefined,
      independent: c.independent,
      un_member: c.unMember,
      landlocked: c.landlocked,
      borders: (c.borders ?? []).map((b) => `country:${byCca3.get(b)?.cca2 ?? b}`),
      emoji: c.flag,
      visual_key: legacy?.visualKey,
    },
    provenance: provenance('mledoze/countries', {
      source_url: SOURCES.countries,
      license: 'ODbL-1.0',
    }),
  }
  countries.push(entity)
}

// Gebiete, die nur im Legacy-Bestand existieren (z. B. XK Kosovo ist in mledoze; fehlende ergänzen)
for (const [iso2, legacy] of legacyCountries) {
  if (countries.some((c) => c.attributes.iso2 === iso2)) continue
  countries.push({
    id: `country:${iso2}`,
    type: 'country',
    names: { de: legacy.name },
    aliases: [],
    geometry: `geo/outlines/${iso2}.json`,
    media: [
      {
        id: `media:flag:${iso2}`,
        kind: 'flag',
        url: `media/flags/countries/${iso2}.svg`,
        source: 'country-flag-icons 1.6.20',
        source_url: 'https://github.com/catamphetamine/country-flag-icons',
        license: 'MIT',
        attribution: 'country-flag-icons (MIT)',
      },
    ],
    attributes: { iso2, continent: legacy.continent, borders: [] },
    provenance: provenance('ugbzspiele', { source_url: legacy.source }),
  })
}

// Umrisse: 50m für Einzelländer, 110m für die Weltkarte.
function isoOf(f) {
  const p = f.properties
  const a2 = p.ISO_A2_EH && p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : p.ISO_A2
  return a2 && a2 !== '-99' ? a2 : undefined
}
const outlines = new Map()
for (const f of ne50.features) {
  const iso = isoOf(f)
  if (iso) outlines.set(iso, f.geometry)
}
let outlineCount = 0
for (const c of countries) {
  const g = outlines.get(c.attributes.iso2)
  if (g) {
    writeJson(join(DATA, 'geo', 'outlines', `${c.attributes.iso2}.json`), {
      type: g.type,
      coordinates: roundCoords(g.coordinates, 3),
    })
    outlineCount++
  } else {
    delete c.geometry
  }
}
const world = {
  type: 'FeatureCollection',
  features: ne110.features
    .map((f) => ({
      type: 'Feature',
      properties: { id: isoOf(f) ? `country:${isoOf(f)}` : undefined, name: f.properties.NAME },
      geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates, 2) },
    }))
    .filter((f) => f.properties.id),
}
const onWorld = new Set(world.features.map((f) => f.properties.id))
for (const c of countries) if (onWorld.has(c.id)) c.attributes.on_world_map = true
writeJson(join(DATA, 'geo', 'world.json'), world)
writeJson(join(DATA, 'geo', 'SOURCES.json'), {
  natural_earth: { url: 'https://www.naturalearthdata.com/', license: 'Public Domain', versions: ['110m', '50m'] },
})

countries.sort((a, b) => a.id.localeCompare(b.id))
writeJson(join(DATA, 'entities', 'countries.json'), countries)
writeJson(join(DATA, 'meta', 'continents.json'), CONTINENTS)
console.log(`Länder: ${countries.length}, Umrisse: ${outlineCount}, Weltkarte: ${world.features.length} Features`)
