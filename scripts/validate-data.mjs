// Validiert /data: Pflichtfelder, Referenzintegrität, Lizenzpflicht für Medien, Koordinaten.
// Erzeugt data/index.json, data/search.json, data/version.json und data/quality.json. Bricht bei Fehlern ab.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { DATA, PUBLIC, readJson, writeJson, listDir } from './lib/common.mjs'

const errors = []
const warnings = []
const err = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

const files = {
  countries: 'entities/countries.json',
  cities: 'entities/cities.json',
  landmarks: 'entities/landmarks.json',
  rivers: 'entities/rivers.json',
  lakes: 'entities/lakes.json',
  mountains: 'entities/mountains.json',
}
const regionFiles = listDir(join(DATA, 'entities', 'regions')).filter((f) => f.endsWith('.json'))
const plateFiles = listDir(join(DATA, 'entities', 'license-plates')).filter((f) => f.endsWith('.json'))
const entities = new Map()
const byType = {}
function load(rel) {
  const p = join(DATA, rel)
  if (!existsSync(p)) return /rivers|lakes|mountains/.test(rel) ? [] : (err(`fehlt: ${rel}`), [])
  return readJson(p)
}
const all = [
  ...load(files.countries),
  ...load(files.cities),
  ...load(files.landmarks),
  ...load(files.rivers),
  ...load(files.lakes),
  ...load(files.mountains),
  ...regionFiles.flatMap((f) => load(`entities/regions/${f}`)),
  ...plateFiles.flatMap((f) => load(`entities/license-plates/${f}`)),
]
const ENTITY_TYPES = new Set(['country', 'region', 'city', 'river', 'lake', 'mountain', 'landmark', 'license_plate'])
const mediaAll = []
const flagRatios = {}
const expectedFlagRatios = { CH: 1, VA: 1, NP: 282 / 342, QA: 28 / 11 }
for (const e of all) {
  if (!e.id || !/^[a-z_]+:[A-Za-z0-9._-]+$/.test(e.id)) err(`ungültige ID: ${JSON.stringify(e.id)}`)
  if (entities.has(e.id)) err(`doppelte ID: ${e.id}`)
  entities.set(e.id, e)
  if (!ENTITY_TYPES.has(e.type)) err(`${e.id}: unbekannter Typ ${e.type}`)
  if (!e.names?.de) err(`${e.id}: names.de fehlt`)
  if (!e.provenance?.source) err(`${e.id}: provenance.source fehlt`)
  if (e.location) {
    const { lat, lon } = e.location
    if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) err(`${e.id}: ungültige Koordinaten`)
  }
  if (e.geometry && !existsSync(join(DATA, e.geometry))) err(`${e.id}: Geometrie ${e.geometry} fehlt`)
  for (const m of e.media ?? []) {
    mediaAll.push({ ...m, object_id: e.id })
    if (!m.license) err(`${e.id}: Medium ${m.id} ohne license`)
    if (!m.attribution) err(`${e.id}: Medium ${m.id} ohne attribution`)
    if (!m.source) err(`${e.id}: Medium ${m.id} ohne source`)
    if (!existsSync(join(PUBLIC, m.url))) err(`${e.id}: Datei fehlt ${m.url}`)
    if (e.type === 'country' && m.kind === 'flag' && m.url.endsWith('.svg') && existsSync(join(PUBLIC, m.url))) {
      const svg = readFileSync(join(PUBLIC, m.url), 'utf8')
      const viewBox = svg.match(/viewBox="[-.\d]+\s+[-.\d]+\s+([.\d]+)\s+([.\d]+)"/)
      if (!viewBox) err(`${e.id}: Flagge ohne gültige viewBox`)
      else {
        const ratio = Number(viewBox[1]) / Number(viewBox[2])
        flagRatios[e.attributes.iso2] = Number(ratio.toFixed(4))
        const expected = expectedFlagRatios[e.attributes.iso2]
        if (expected && Math.abs(ratio - expected) > 0.03) err(`${e.id}: ungenaues Flaggenformat ${ratio.toFixed(3)} statt ${expected.toFixed(3)}`)
      }
    }
  }
  byType[e.type] = (byType[e.type] ?? 0) + 1
}
for (const e of all) {
  for (const c of e.attributes?.countries ?? []) if (!entities.has(c)) err(`${e.id}: countries → ${c} existiert nicht`)
  for (const key of ['country', 'region', 'capital']) {
    const ref = e.attributes?.[key]
    if (ref && !entities.has(ref)) err(`${e.id}: attributes.${key} → ${ref} existiert nicht`)
  }
  for (const b of e.attributes?.borders ?? []) if (!entities.has(b)) warn(`${e.id}: Nachbar ${b} existiert nicht`)
}
const rels = load('relationships/index.json')
const REL_TYPES = new Set(['capital_of', 'located_in', 'neighbor_of', 'flows_through', 'part_of', 'plate_code_of', 'similar_to'])
for (const r of rels) {
  if (!REL_TYPES.has(r.type)) err(`Beziehung unbekannter Typ ${r.type}`)
  if (!entities.has(r.from)) err(`Beziehung ${r.type}: from ${r.from} fehlt`)
  if (!entities.has(r.to)) err(`Beziehung ${r.type}: to ${r.to} fehlt`)
}

// Qualitätskennzahlen
const countries = all.filter((e) => e.type === 'country')
const missing = (field) => countries.filter((c) => c.attributes[field] === undefined).map((c) => c.id)
const quality = {
  generated_at: new Date().toISOString(),
  counts: byType,
  media: mediaAll.length,
  relationships: rels.length,
  countries_without_population: missing('population'),
  countries_without_capital: missing('capital'),
  countries_without_area: missing('area_km2'),
  countries_without_outline: countries.filter((c) => !c.geometry).map((c) => c.id),
  entities_without_media: all.filter((e) => !(e.media?.length) && ['country', 'region', 'landmark'].includes(e.type)).map((e) => e.id),
  conflicts: all.filter((e) => e.provenance?.conflicts?.length).map((e) => ({ id: e.id, conflicts: e.provenance.conflicts })),
  flag_aspect_ratios: flagRatios,
  warnings,
}
writeJson(join(DATA, 'quality.json'), quality)

// Manifest der Regionskarten (Dateiname pro Land)
const mapFiles = listDir(join(PUBLIC, 'media', 'maps', 'regions')).filter((f) => /^[A-Z]{2}-[A-Z0-9]+\.json$/.test(f))
const regionMaps = {}
for (const f of mapFiles) {
  const iso = f.split('-')[0]
  const rank = { ADM1: 0, ADM2: 1, NE: 2, EUROPE: 3 }[f.replace('.json', '').split('-')[1]] ?? 9
  if (!regionMaps[iso] || rank < regionMaps[iso].rank) regionMaps[iso] = { file: `media/maps/regions/${f}`, rank }
}
for (const k of Object.keys(regionMaps)) regionMaps[k] = regionMaps[k].file

// Index für Lazy Loading
const regionsByCountry = Object.fromEntries(
  regionFiles.map((f) => {
    const iso = f.replace('.json', '')
    return [`country:${iso}`, { file: `entities/regions/${f}`, count: all.filter((e) => e.type === 'region' && e.attributes.country === `country:${iso}`).length }]
  }),
)
const flagsCount = mediaAll.filter((m) => m.kind === 'flag').length
const photosCount = mediaAll.filter((m) => m.kind === 'photo').length
const platesByCountry = Object.fromEntries(
  plateFiles.map((f) => {
    const iso = f.replace('.json', '')
    return [iso, { file: `entities/license-plates/${f}`, count: all.filter((e) => e.type === 'license_plate' && e.attributes.country === `country:${iso}`).length }]
  }),
)
const index = {
  plates: platesByCountry,
  region_maps: regionMaps,
  files: { ...files, relationships: 'relationships/index.json', world: 'geo/world.json', continents: 'meta/continents.json' },
  regions: regionsByCountry,
  counts: {
    ...byType,
    flags: flagsCount,
    photos: photosCount,
    capitals: countries.filter((c) => c.attributes.capital).length,
    water: (byType.river ?? 0) + (byType.lake ?? 0),
  },
  continents: Object.fromEntries(
    Object.keys(readJson(join(DATA, 'meta', 'continents.json'))).map((k) => [k, countries.filter((c) => c.attributes.continent === k).length]),
  ),
}
writeJson(join(DATA, 'index.json'), index)

// Suchindex
const search = all.map((e) => ({ id: e.id, t: e.type, n: e.names.de, a: [e.names.en, ...(e.aliases ?? [])].filter(Boolean).slice(0, 6), c: e.attributes.country }))
writeJson(join(DATA, 'search.json'), search)

// Version aus Inhalt
const hash = createHash('sha1')
for (const f of ['entities/countries.json', 'entities/cities.json', 'entities/landmarks.json', 'entities/rivers.json', 'entities/lakes.json', 'entities/mountains.json', 'relationships/index.json', ...regionFiles.map((f) => `entities/regions/${f}`), ...plateFiles.map((f) => `entities/license-plates/${f}`)])
  if (existsSync(join(DATA, f))) hash.update(readFileSync(join(DATA, f)))
const version = { schema_version: 1, data_version: hash.digest('hex').slice(0, 12), generated_at: new Date().toISOString() }
const prev = existsSync(join(DATA, 'version.json')) ? readJson(join(DATA, 'version.json')) : null
if (!prev || prev.data_version !== version.data_version) writeJson(join(DATA, 'version.json'), version)

// Attribution-Seite generieren
const lines = ['# Bild- und Datenquellen', '', 'Automatisch aus den Medien-Metadaten erzeugt (`npm run data:validate`).', '']
const bySource = new Map()
for (const m of mediaAll) {
  const k = `${m.source} · ${m.license}`
  bySource.set(k, (bySource.get(k) ?? 0) + 1)
}
lines.push('## Übersicht', '', '| Quelle · Lizenz | Anzahl |', '|---|---|')
for (const [k, n] of [...bySource].sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${n} |`)
lines.push('', '## Fotos', '')
for (const m of mediaAll.filter((x) => x.kind === 'photo').sort((a, b) => a.object_id.localeCompare(b.object_id)))
  lines.push(`- **${entities.get(m.object_id).names.de}** · ${m.author ?? 'unbekannt'} · ${m.license} · [Quelle](${m.source_url})`)
lines.push('', '## Länderflaggen', '', '254 Flaggen aus [country-flag-icons](https://github.com/catamphetamine/country-flag-icons) (MIT).', '', '## Regionalflaggen', '', 'Aus [niemela/flags](https://github.com/niemela/flags) (Metadaten CC BY-SA 4.0); einzelne Flaggen behalten ihre jeweilige Ursprungslizenz. Die Quellseite ist pro Flagge in den Medien-Metadaten hinterlegt und in der App über ⓘ erreichbar.', '', '## Geodaten', '', '[Natural Earth](https://www.naturalearthdata.com/) (Public Domain), [geoBoundaries](https://www.geoboundaries.org/) (CC BY 4.0), [mledoze/countries](https://github.com/mledoze/countries) (ODbL 1.0), [Wikidata](https://www.wikidata.org/) (CC0).')
writeJson(join(DATA, 'attribution.json'), { markdown: lines.join('\n') })

for (const w of warnings.slice(0, 10)) console.warn('⚠', w)
if (warnings.length > 10) console.warn(`⚠ … ${warnings.length - 10} weitere Warnungen (siehe data/quality.json)`)
for (const e of errors) console.error('✖', e)
console.log(`Entities: ${all.length} ${JSON.stringify(byType)} · Medien: ${mediaAll.length} · Beziehungen: ${rels.length} · Version ${version.data_version}`)
if (errors.length) {
  console.error(`${errors.length} Fehler`)
  process.exit(1)
}
