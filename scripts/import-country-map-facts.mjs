// Versioned supplementary map facts; no runtime calls to an external country API.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CACHE, DATA, writeJson } from './lib/common.mjs'
const revision = 'bfadee4f951682c29970e53677707bc558e80b74'
const sourceUrl = `https://raw.githubusercontent.com/restcountries/restcountries/${revision}/src/main/resources/countriesV3.1.json`
const cache = join(CACHE, `restcountries-${revision}.json`)
if (!existsSync(cache)) {
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error(`Country map facts: ${response.status}`)
  writeJson(cache, await response.json())
}
const source = JSON.parse(readFileSync(cache, 'utf8'))
const sourceByIso = new Map(source.map((c) => [c.cca2, c]))
const countries = JSON.parse(readFileSync(join(DATA, 'entities/countries.json'), 'utf8'))
const noRoadConvention = new Set(['AQ', 'BV', 'HM', 'TF', 'GS', 'UM'])
const entries = {}
for (const country of countries) {
  const iso = country.attributes.iso2
  if (iso === 'EU') continue
  const row = sourceByIso.get(iso)
  const root = row?.idd?.root
  let callingCodes = root
    ? row.idd.suffixes?.length
      ? row.idd.suffixes.map((suffix) => root + suffix)
      : [root]
    : []
  // These shared numbering plans include domestic routing ranges in the source.
  if (['US', 'CA'].includes(iso)) callingCodes = ['+1']
  if (['RU', 'KZ'].includes(iso)) callingCodes = ['+7']
  if (iso === 'EH') callingCodes = ['+212']
  // The Vatican's published contacts use Italy's +39, not the reserved +379.
  if (iso === 'VA') callingCodes = ['+39']
  entries[country.id] = {
    callingCodes: [...new Set(callingCodes)],
    ...(row && !noRoadConvention.has(iso) && ['left', 'right'].includes(row.car?.side)
      ? { drivingSide: row.car.side }
      : {}),
    ...(iso === 'VA'
      ? {
          note: 'Telefonanschlüsse verwenden +39 mit der Ortskennzahl 06 698.',
          sourceUrl: 'https://www.vatican.va/content/vatican/en/info.html',
        }
      : {}),
  }
}
writeJson(join(DATA, 'meta/country-map-facts.json'), {
  checkedAt: '2026-10-31',
  source: {
    name: 'REST Countries',
    url: `https://github.com/restcountries/restcountries/blob/${revision}/src/main/resources/countriesV3.1.json`,
    license: 'MPL-2.0',
    revision,
  },
  countries: entries,
})
console.log(`Karten-Zusatzdaten: ${Object.keys(entries).length} Länder und Gebiete`)
