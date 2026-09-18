// Deutsche Bezeichnungen aus Wikidata: Sprachen (ISO 639-3, P220), Währungen (ISO 4217, P498), Regionen (ISO 3166-2, P300).
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { CACHE, DATA, readJson, writeJson, listDir } from './lib/common.mjs'
import { batched } from './lib/wikidata.mjs'

const cachePath = join(CACHE, 'wikidata-labels.json')
const countriesPath = join(DATA, 'entities', 'countries.json')
const countries = readJson(countriesPath)
const regionFiles = listDir(join(DATA, 'entities', 'regions')).filter((f) => f.endsWith('.json'))

let cache = existsSync(cachePath) && !process.argv.includes('--refresh') ? readJson(cachePath) : { languages: {}, currencies: {}, regions: {} }

// mledoze liefert Sprachen als ISO-639-3-Schlüssel nur in `languages` (Objekt) – im Import wurden nur Werte übernommen.
// Deshalb hier die Rohdaten erneut lesen.
const raw = readJson(join(CACHE, 'countries.json'))
const langCodes = [...new Set(raw.flatMap((c) => Object.keys(c.languages ?? {})))]
const curCodes = [...new Set(raw.flatMap((c) => Object.keys(c.currencies ?? {})))]
const regionCodes = regionFiles.flatMap((f) => readJson(join(DATA, 'entities', 'regions', f)).map((r) => r.attributes.code))

const missingLang = langCodes.filter((c) => !cache.languages[c])
if (missingLang.length) {
  const rows = await batched(missingLang.map((c) => `"${c}"`), (v) => `SELECT ?code ?label WHERE { VALUES ?code { ${v} } ?item wdt:P220 ?code . ?item rdfs:label ?label FILTER(LANG(?label) = "de") }`)
  for (const r of rows) cache.languages[r.code.value] = r.label.value
}
const missingCur = curCodes.filter((c) => !cache.currencies[c])
if (missingCur.length) {
  const rows = await batched(missingCur.map((c) => `"${c}"`), (v) => `SELECT ?code ?label WHERE { VALUES ?code { ${v} } ?item wdt:P498 ?code . FILTER NOT EXISTS { ?item wdt:P582 ?end } ?item rdfs:label ?label FILTER(LANG(?label) = "de") }`)
  for (const r of rows) cache.currencies[r.code.value] = r.label.value
}
const missingReg = regionCodes.filter((c) => !cache.regions[c])
if (missingReg.length) {
  const rows = await batched(missingReg.map((c) => `"${c}"`), (v) => `SELECT ?code ?de ?en WHERE { VALUES ?code { ${v} } ?item wdt:P300 ?code . OPTIONAL { ?item rdfs:label ?de FILTER(LANG(?de) = "de") } OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") } }`, 80, (i, n) => process.stdout.write(`Regionen ${i}/${n}\r`))
  for (const r of rows) cache.regions[r.code.value] = { de: r.de?.value, en: r.en?.value }
}
writeJson(cachePath, cache)

// Länder: Sprachen/Währungen deutsch
const rawByIso = new Map(raw.map((c) => [c.cca2, c]))
let langHits = 0
for (const c of countries) {
  const r = rawByIso.get(c.attributes.iso2)
  if (!r) continue
  const langs = Object.entries(r.languages ?? {}).map(([code, en]) => ({ code, de: cache.languages[code] ?? en, en }))
  c.attributes.languages = langs.map((l) => l.de)
  c.attributes.languages_detail = langs
  if (langs.some((l) => l.de !== l.en)) langHits++
  c.attributes.currencies = Object.entries(r.currencies ?? {}).map(([code, v]) => ({ code, name: cache.currencies[code] ?? v.name, name_en: v.name, symbol: v.symbol }))
}
writeJson(countriesPath, countries)

// Regionen: deutsche Namen, englischer Name als Alias
let regHits = 0
const strip = (s) => s?.replace(/^(Oblast|Präfektur|Provinz|Region|Kanton|Bundesland|Komitat|Bezirk|Landkreis|Kreis|Gemeinde|Bundesstaat) /, '')
for (const f of regionFiles) {
  const p = join(DATA, 'entities', 'regions', f)
  const list = readJson(p)
  for (const r of list) {
    const l = cache.regions[r.attributes.code]
    if (!l?.de) continue
    const de = l.de
    if (de !== r.names.de) {
      const aliases = new Set([...(r.aliases ?? []), r.names.de, l.en, strip(de)].filter((a) => a && a !== de))
      r.names = { de, en: l.en ?? r.names.en }
      r.aliases = [...aliases]
      regHits++
    } else if (l.en && !r.names.en) r.names.en = l.en
  }
  writeJson(p, list)
}
console.log(`Labels: ${Object.keys(cache.languages).length} Sprachen, ${Object.keys(cache.currencies).length} Währungen, ${langHits} Länder angepasst, ${regHits} Regionsnamen eingedeutscht`)
