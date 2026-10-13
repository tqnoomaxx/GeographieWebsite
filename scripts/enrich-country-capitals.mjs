// Current capitals and explicitly labelled government seats. Curated exceptions override legacy data.
import { join } from 'node:path'
import { DATA, ROOT, readJson, writeJson, slugify } from './lib/common.mjs'

const catalog = readJson(join(ROOT, 'scripts/data/country-capitals.json'))
const countryPath = join(DATA, 'entities/countries.json')
const cityPath = join(DATA, 'entities/cities.json')
const countries = readJson(countryPath)
const cities = readJson(cityPath)
const relationships = readJson(join(DATA, 'relationships/index.json')).filter(
  (relationship) => relationship.type !== 'capital_of' || !relationship.to.startsWith('country:'),
)
const norm = (value) =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
const capitalIds = new Set()
let multiple = 0
for (const country of countries) {
  const entry = catalog.countries[country.attributes.iso2]
  country.attributes.capitals = []
  country.attributes.capital_details = []
  if (!entry) continue
  const details = entry.entries.map((place) => {
    let city = cities.find((item) => item.id === place.city)
    city ??= cities.find(
      (item) =>
        item.attributes.country === country.id &&
        [item.names.de, item.names.en, ...(item.aliases ?? [])]
          .filter(Boolean)
          .some((name) => [place.name, ...place.aliases].some((candidate) => norm(name) === norm(candidate))),
    )
    if (!city) {
      city = {
        id: `city:${country.attributes.iso2}-${slugify(place.name)}`,
        type: 'city',
        names: { de: place.name },
        aliases: [],
        media: [],
        attributes: { country: country.id, continent: country.attributes.continent },
        provenance: { source: place.source, source_url: place.source_url, imported_at: catalog.checked_at },
      }
      cities.push(city)
    }
    city.aliases = [
      ...new Set(
        [...(city.aliases ?? []), city.names.de, city.names.en, ...place.aliases].filter(
          (name) => name && name !== place.name,
        ),
      ),
    ]
    city.names.de = place.name
    if (place.location && !city.location) city.location = place.location
    if (place.wikidata) city.attributes.wikidata = place.wikidata
    if (place.quiz) {
      capitalIds.add(city.id)
      relationships.push({ from: city.id, to: country.id, type: 'capital_of' })
      city.attributes.capital_role = place.role
    }
    return {
      city: city.id,
      role: place.role,
      quiz: place.quiz,
      source: place.source,
      source_url: place.source_url,
      checked_at: catalog.checked_at,
    }
  })
  country.attributes.capital_details = details
  country.attributes.capitals = details.filter((place) => place.quiz).map((place) => place.city)
  const primary = country.attributes.capitals[0]
  if (primary) country.attributes.capital = primary
  else delete country.attributes.capital
  country.attributes.capital_names = country.attributes.capitals.map(
    (id) => cities.find((city) => city.id === id).names.de,
  )
  if (entry.note) country.attributes.capital_note = entry.note
  else delete country.attributes.capital_note
  country.provenance.fields = {
    ...country.provenance.fields,
    capitals: { source: details[0].source, imported_at: catalog.checked_at },
  }
  if (country.attributes.capitals.length > 1) multiple++
}
for (const city of cities) {
  city.attributes.is_capital = capitalIds.has(city.id)
  if (!city.attributes.is_capital) delete city.attributes.capital_role
}
cities.sort((a, b) => a.id.localeCompare(b.id))
writeJson(countryPath, countries)
writeJson(cityPath, cities)
writeJson(join(DATA, 'relationships/index.json'), relationships)
console.log(`Hauptstädte: ${capitalIds.size} aktuelle Städte; ${multiple} Länder mit mehreren Hauptstädten`)
