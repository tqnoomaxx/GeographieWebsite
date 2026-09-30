// Polnische Kfz-Kennzeichen direkt aus Anlage 13 der amtlichen ELI-Fassung.
// Die erste Stelle codiert die Woiwodschaft, die folgenden Stellen Stadt oder Powiat.
import { join } from 'node:path'
import { DATA, writeJson } from './lib/common.mjs'

const SOURCE = 'https://eli.gov.pl/api/acts/DU/2024/1709/text.html'
const REGION_BY_NAME = {
  DOLNOŚLĄSKIE: 'PL-02',
  'KUJAWSKO-POMORSKIE': 'PL-04',
  LUBELSKIE: 'PL-06',
  LUBUSKIE: 'PL-08',
  ŁÓDZKIE: 'PL-10',
  MAŁOPOLSKIE: 'PL-12',
  MAZOWIECKIE: 'PL-14',
  OPOLSKIE: 'PL-16',
  PODKARPACKIE: 'PL-18',
  PODLASKIE: 'PL-20',
  POMORSKIE: 'PL-22',
  ŚLĄSKIE: 'PL-24',
  ŚWIĘTOKRZYSKIE: 'PL-26',
  'WARMIŃSKO-MAZURSKIE': 'PL-28',
  WIELKOPOLSKIE: 'PL-30',
  ZACHODNIOPOMORSKIE: 'PL-32',
}

const response = await fetch(SOURCE, {
  headers: { 'User-Agent': 'AtlasfunkeImporter/0.1 (educational geography data)' },
})
if (!response.ok) throw new Error(`Polnische ELI-Daten nicht erreichbar (${response.status})`)
const html = await response.text()
const start = html.indexOf('<section id="part_14">')
const end = html.indexOf('<section id="part_15">', start)
if (start < 0 || end < 0) throw new Error('Anlage 13 wurde in der ELI-Fassung nicht gefunden')

const decode = (value) =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
const codes = (value) => value.split(',').map((item) => item.trim()).filter((item) => /^[A-Z]$|^[A-Z]{1,2}$/.test(item))
const CITY_DE = {
  Warszawa: 'Warschau',
  Wrocław: 'Breslau',
  Gdańsk: 'Danzig',
  Szczecin: 'Stettin',
  Poznań: 'Posen',
  Kraków: 'Krakau',
}
const title = (value) => {
  if (!value) return value
  const city = value.replace(/^m\.?\s*st\.?\s*/iu, '')
  if (city !== value) return CITY_DE[city] ?? city
  if (CITY_DE[value]) return CITY_DE[value]
  if (/^[a-ząćęłńóśźż]/u.test(value)) return `Powiat ${value[0].toLocaleUpperCase('pl-PL')}${value.slice(1)}`
  return value
}

let currentRegion
const byCode = new Map()
for (const row of html.slice(start, end).matchAll(/<TR CLASS="pro-tbody">([\s\S]*?)<\/TR>/g)) {
  const cells = [...row[1].matchAll(/<TD[^>]*>([\s\S]*?)<\/TD>/g)].map((cell) => decode(cell[1])).slice(1)
  if (cells.length < 6) continue
  const [, voivodeship, district, regionLetters, districtLetters] = cells
  if (voivodeship) currentRegion = REGION_BY_NAME[voivodeship]
  if (!district || !currentRegion) continue
  for (const regionCode of codes(regionLetters)) {
    for (const districtCode of codes(districtLetters)) {
      const code = `${regionCode}${districtCode}`
      const name = title(district)
      if (byCode.has(code)) continue
      byCode.set(code, {
        id: `license_plate:PL-${code}`,
        type: 'license_plate',
        names: { de: name, pl: district },
        aliases: name === district ? [] : [district],
        attributes: {
          code,
          country: 'country:PL',
          region: `region:${currentRegion}`,
          districts: [district],
          historical: false,
        },
        provenance: {
          source: 'Dziennik Ustaw / ELI',
          source_url: SOURCE,
          imported_at: new Date().toISOString().slice(0, 10),
          license: 'amtliche Rechtsvorschrift',
        },
      })
    }
  }
}

const plates = [...byCode.values()].sort((a, b) => a.attributes.code.localeCompare(b.attributes.code))
if (plates.length < 300) throw new Error(`Unplausibel wenige polnische Kennzeichen: ${plates.length}`)
writeJson(join(DATA, 'entities', 'license-plates', 'PL.json'), plates)
console.log(`Kennzeichen PL: ${plates.length} amtliche Stadt-/Powiat-Kürzel`)
