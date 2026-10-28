import { join } from 'node:path'
import { ROOT, readJson } from './common.mjs'

const snapshot = readJson(join(ROOT, 'scripts/data/country-population.json'))

/** Use one reference date and one UN scenario; never choose the largest historical value. */
export function applyCountryPopulation(countries) {
  let count = 0
  for (const country of countries) {
    // mledoze uses UNK for Kosovo; WPP uses XKX.
    const iso3 = country.attributes.iso2 === 'XK' ? 'XKX' : country.attributes.iso3
    const population = snapshot.countries[iso3]
    if (population === undefined) continue
    if (!Number.isSafeInteger(population) || population <= 0)
      throw new Error(`Invalid UN population for ${iso3}`)
    country.attributes.population = population
    country.provenance.fields = {
      ...country.provenance.fields,
      population: {
        source: snapshot.source,
        source_id: iso3,
        source_url: snapshot.source_url,
        reference_date: snapshot.reference_date,
        method: snapshot.method,
        imported_at: snapshot.retrieved_at,
      },
    }
    if (country.provenance.conflicts) {
      country.provenance.conflicts = country.provenance.conflicts.filter(
        (item) => item.field !== 'population',
      )
      if (!country.provenance.conflicts.length) delete country.provenance.conflicts
    }
    count++
  }
  return count
}
