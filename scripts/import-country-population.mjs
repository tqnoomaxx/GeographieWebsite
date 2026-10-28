import { join } from 'node:path'
import { DATA, readJson, writeJson } from './lib/common.mjs'
import { applyCountryPopulation } from './lib/country-population.mjs'

const path = join(DATA, 'entities/countries.json')
const countries = readJson(path)
const count = applyCountryPopulation(countries)
writeJson(path, countries)
console.log(`UN WPP 2024: ${count} Länder/Gebiete mit einheitlichen Einwohnerzahlen angereichert`)
