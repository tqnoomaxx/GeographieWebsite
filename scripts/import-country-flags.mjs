// Importiert vollständige Länderflaggen in ihren tatsächlichen Seitenverhältnissen.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(ROOT, 'node_modules', 'svg-country-flags', 'svg')
const TARGET = join(ROOT, 'public', 'media', 'flags', 'countries')
const DATA = join(ROOT, 'public', 'data', 'entities', 'countries.json')
const VERSION = '1.2.10'

if (!existsSync(SOURCE)) throw new Error('svg-country-flags fehlt. Bitte zuerst npm install ausführen.')
mkdirSync(TARGET, { recursive: true })

const countries = JSON.parse(readFileSync(DATA, 'utf8'))
const retained = []
let imported = 0

for (const country of countries) {
  const iso2 = country.attributes?.iso2
  if (!iso2) continue
  const source = join(SOURCE, `${iso2.toLowerCase()}.svg`)
  if (!existsSync(source)) {
    retained.push(iso2)
    continue
  }
  const svg = readFileSync(source)
  copyFileSync(source, join(TARGET, `${iso2}.svg`))
  const flag = country.media?.find((item) => item.kind === 'flag')
  if (flag) {
    flag.source = `svg-country-flags ${VERSION}`
    flag.source_url = 'https://github.com/hampusborgos/country-flags'
    flag.license = 'Public domain'
    flag.attribution = 'country-flags (Public domain)'
  }
  country.attributes.visual_key = createHash('sha256').update(svg).digest('hex').slice(0, 16)
  imported += 1
}

writeFileSync(DATA, `${JSON.stringify(countries, null, 1)}\n`)
console.log(`${imported} präzise Länderflaggen aus svg-country-flags ${VERSION} importiert.`)
if (retained.length) {
  console.log(
    `${retained.length} nicht-ISO-Gebietsflaggen aus dem bestehenden Bestand beibehalten: ${retained.join(', ')}`,
  )
}
