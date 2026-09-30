// Ergänzt den kuratierten Altbestand um international bekannte Sehenswürdigkeiten.
// Fotos und Lizenzmetadaten kommen über die offiziellen MediaWiki-APIs von Wikipedia/Wikimedia Commons.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { DATA, PUBLIC, ROOT, readJson, writeJson } from './lib/common.mjs'

const ITEMS = [
  ['schonbrunn', 'Schloss Schönbrunn', 'Schönbrunn Palace', 'AT', 'Wien', 'europe', 'palace'],
  ['neuschwanstein', 'Schloss Neuschwanstein', 'Neuschwanstein Castle', 'DE', 'Schwangau', 'europe', 'castle'],
  ['brandenburg-gate', 'Brandenburger Tor', 'Brandenburg Gate', 'DE', 'Berlin', 'europe', 'monument'],
  ['charles-bridge', 'Karlsbrücke', 'Charles Bridge', 'CZ', 'Prag', 'europe', 'bridge'],
  ['prague-castle', 'Prager Burg', 'Prague Castle', 'CZ', 'Prag', 'europe', 'castle'],
  ['wawel-castle', 'Wawel-Schloss', 'Wawel Castle', 'PL', 'Krakau', 'europe', 'castle'],
  ['hungarian-parliament', 'Ungarisches Parlamentsgebäude', 'Hungarian Parliament Building', 'HU', 'Budapest', 'europe', 'building'],
  ['dubrovnik-walls', 'Stadtmauer von Dubrovnik', 'Walls of Dubrovnik', 'HR', 'Dubrovnik', 'europe', 'fortification'],
  ['tallinn-town-hall', 'Rathaus von Tallinn', 'Tallinn Town Hall', 'EE', 'Tallinn', 'europe', 'building'],
  ['rila-monastery', 'Kloster Rila', 'Rila Monastery', 'BG', 'Rila', 'europe', 'monastery'],
  ['saint-basils', 'Basilius-Kathedrale', "Saint Basil's Cathedral", 'RU', 'Moskau', 'europe', 'religious'],
  ['lake-bled', 'Bleder See', 'Lake Bled', 'SI', 'Bled', 'europe', 'landscape'],
  ['great-zimbabwe', 'Groß-Simbabwe', 'Great Zimbabwe', 'ZW', 'Masvingo', 'africa', 'archaeological'],
  ['hassan-ii-mosque', 'Hassan-II.-Moschee', 'Hassan II Mosque', 'MA', 'Casablanca', 'africa', 'religious'],
  ['casbah-algiers', 'Kasbah von Algier', 'Casbah of Algiers', 'DZ', 'Algier', 'africa', 'historic-quarter'],
  ['el-jem', 'Amphitheater von El Djem', 'Amphitheatre of El Jem', 'TN', 'El Djem', 'africa', 'archaeological'],
  ['stone-town', 'Stone Town', 'Stone Town', 'TZ', 'Sansibar-Stadt', 'africa', 'historic-quarter'],
  ['djenne-mosque', 'Große Moschee von Djenné', 'Great Mosque of Djenné', 'ML', 'Djenné', 'africa', 'religious'],
  ['le-morne', 'Le Morne Brabant', 'Le Morne Brabant', 'MU', 'Le Morne', 'africa', 'cultural-landscape'],
  ['union-buildings', 'Union Buildings', 'Union Buildings', 'ZA', 'Pretoria', 'africa', 'building'],
  ['burj-khalifa', 'Burj Khalifa', 'Burj Khalifa', 'AE', 'Dubai', 'asia', 'building'],
  ['sheikh-zayed-mosque', 'Scheich-Zayid-Moschee', 'Sheikh Zayed Grand Mosque', 'AE', 'Abu Dhabi', 'asia', 'religious'],
  ['petronas-towers', 'Petronas Towers', 'Petronas Towers', 'MY', 'Kuala Lumpur', 'asia', 'building'],
  ['gardens-by-the-bay', 'Gardens by the Bay', 'Gardens by the Bay', 'SG', 'Singapur', 'asia', 'garden'],
  ['merlion', 'Merlion', 'Merlion', 'SG', 'Singapur', 'asia', 'monument'],
  ['forbidden-city', 'Verbotene Stadt', 'Forbidden City', 'CN', 'Peking', 'asia', 'palace'],
  ['terracotta-army', 'Terrakotta-Armee', 'Terracotta Army', 'CN', "Xi’an", 'asia', 'archaeological'],
  ['potala-palace', 'Potala-Palast', 'Potala Palace', 'CN', 'Lhasa', 'asia', 'palace'],
  ['gyeongbokgung', 'Gyeongbokgung-Palast', 'Gyeongbokgung', 'KR', 'Seoul', 'asia', 'palace'],
  ['grand-palace-bangkok', 'Großer Palast von Bangkok', 'Grand Palace', 'TH', 'Bangkok', 'asia', 'palace'],
  ['bagan', 'Tempelstadt Bagan', 'Bagan', 'MM', 'Bagan', 'asia', 'archaeological'],
  ['shwedagon', 'Shwedagon-Pagode', 'Shwedagon Pagoda', 'MM', 'Yangon', 'asia', 'religious'],
  ['sigiriya', 'Felsenfestung Sigiriya', 'Sigiriya', 'LK', 'Sigiriya', 'asia', 'archaeological'],
  ['registan', 'Registan', 'Registan', 'UZ', 'Samarkand', 'asia', 'square'],
  ['persepolis', 'Persepolis', 'Persepolis', 'IR', 'Persepolis', 'asia', 'archaeological'],
  ['golden-gate', 'Golden Gate Bridge', 'Golden Gate Bridge', 'US', 'San Francisco', 'north-america', 'bridge'],
  ['empire-state', 'Empire State Building', 'Empire State Building', 'US', 'New York City', 'north-america', 'building'],
  ['cn-tower', 'CN Tower', 'CN Tower', 'CA', 'Toronto', 'north-america', 'tower'],
  ['parliament-hill', 'Parliament Hill', 'Parliament Hill', 'CA', 'Ottawa', 'north-america', 'building'],
  ['teotihuacan', 'Teotihuacán', 'Teotihuacan', 'MX', 'Teotihuacán', 'north-america', 'archaeological'],
  ['havana-capitol', 'Kapitol von Havanna', 'El Capitolio', 'CU', 'Havanna', 'north-america', 'building'],
  ['panama-canal', 'Panamakanal', 'Panama Canal', 'PA', 'Panama-Stadt', 'north-america', 'engineering'],
  ['buenos-aires-obelisk', 'Obelisk von Buenos Aires', 'Obelisco de Buenos Aires', 'AR', 'Buenos Aires', 'south-america', 'monument'],
  ['salar-de-uyuni', 'Salar de Uyuni', 'Salar de Uyuni', 'BO', 'Uyuni', 'south-america', 'landscape'],
  ['sydney-harbour-bridge', 'Sydney Harbour Bridge', 'Sydney Harbour Bridge', 'AU', 'Sydney', 'oceania', 'bridge'],
  ['parliament-house-canberra', 'Parliament House', 'Parliament House, Canberra', 'AU', 'Canberra', 'oceania', 'building'],
  ['auckland-sky-tower', 'Sky Tower Auckland', 'Sky Tower (Auckland)', 'NZ', 'Auckland', 'oceania', 'tower'],
  ['nan-madol', 'Nan Madol', 'Nan Madol', 'FM', 'Pohnpei', 'oceania', 'archaeological'],
  ['bikini-atoll', 'Bikini-Atoll', 'Bikini Atoll', 'MH', 'Bikini-Atoll', 'oceania', 'cultural-landscape'],
  ['rock-islands', 'Rock Islands', 'Rock Islands', 'PW', 'Koror', 'oceania', 'cultural-landscape'],
]

const cachePath = join(ROOT, 'scripts', 'content', 'landmark-media.json')
const cache = existsSync(cachePath) ? readJson(cachePath) : {}
const outDir = join(PUBLIC, 'media', 'photos', 'landmarks')
const temp = mkdtempSync(join(tmpdir(), 'atlasfunke-landmarks-'))

function plain(value = '') {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function json(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': 'AtlasfunkeImporter/0.1 (educational geography data)' } })
    if (response.ok) return response.json()
    if (response.status !== 429) throw new Error(`${response.status} ${url}`)
    await pause(1200 * (attempt + 1))
  }
  throw new Error(`429 ${url}`)
}

async function prefetchMissing() {
  const missing = ITEMS.filter(([slug]) => !cache[slug])
  if (!missing.length) return
  const pageParams = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    redirects: '1',
    prop: 'pageimages|pageprops',
    piprop: 'original|name',
    titles: missing.map(([, , title]) => title).join('|'),
  })
  const pageData = await json(`https://en.wikipedia.org/w/api.php?${pageParams}`)
  const renamed = new Map([
    ...(pageData.query?.normalized ?? []).map((item) => [item.from, item.to]),
    ...(pageData.query?.redirects ?? []).map((item) => [item.from, item.to]),
  ])
  const resolveTitle = (title) => {
    let resolved = title
    while (renamed.has(resolved)) resolved = renamed.get(resolved)
    return resolved
  }
  const pages = new Map(Object.values(pageData.query?.pages ?? {}).map((page) => [page.title, page]))
  const wanted = missing
    .map(([slug, , title]) => ({ slug, page: pages.get(resolveTitle(title)) }))
    .filter((item) => item.page?.pageimage)
  if (!wanted.length) return
  const commonsParams = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1600',
    titles: wanted.map((item) => `File:${item.page.pageimage}`).join('|'),
  })
  const commonsData = await json(`https://commons.wikimedia.org/w/api.php?${commonsParams}`)
  const commonsPages = new Map(Object.values(commonsData.query?.pages ?? {}).map((page) => [page.title, page]))
  for (const { slug, page } of wanted) {
    const commonsPage = commonsPages.get(`File:${page.pageimage}`)
    const info = commonsPage?.imageinfo?.[0]
    if (!info?.thumburl && !info?.url) continue
    const ext = info.extmetadata ?? {}
    cache[slug] = {
      wikidata: page.pageprops?.wikibase_item,
      filename: page.pageimage,
      download_url: info.thumburl || info.url,
      source_url: info.descriptionurl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(page.pageimage)}`,
      author: plain(ext.Artist?.value || ext.Credit?.value || 'Wikimedia-Commons-Beitragende'),
      license: plain(ext.LicenseShortName?.value || ext.UsageTerms?.value || 'freie Lizenz'),
      license_url: ext.LicenseUrl?.value,
    }
  }
  writeJson(cachePath, cache)
}

const countries = readJson(join(DATA, 'entities', 'countries.json'))
const countryByIso = new Map(countries.map((country) => [country.attributes.iso2, country]))
const cities = readJson(join(DATA, 'entities', 'cities.json'))
const legacy = readJson(join(DATA, 'entities', 'landmarks.json'))
const expansionIds = new Set(ITEMS.map(([slug]) => `landmark:${slug}`))
const landmarks = legacy.filter((item) => !expansionIds.has(item.id))
let withPhoto = 0

try {
  if (!process.argv.includes('--offline')) {
    try {
      await prefetchMissing()
    } catch (error) {
      console.warn(`Gebündelte Bildabfrage fehlgeschlagen: ${error.message}`)
    }
  }
  for (const [slug, de, en, iso2, place, continent, type] of ITEMS) {
    const country = countryByIso.get(iso2)
    if (!country) continue
    let media = []
    try {
      const source = cache[slug] ?? null
      const output = join(outDir, `${slug}.webp`)
      if (source) {
        if (!existsSync(output)) {
          const input = join(temp, basename(new URL(source.download_url).pathname))
          const response = await fetch(source.download_url)
          if (!response.ok) throw new Error(`Bild ${response.status}`)
          writeFileSync(input, Buffer.from(await response.arrayBuffer()))
          execFileSync('cwebp', ['-quiet', '-q', '82', '-resize', '1600', '0', input, '-o', output])
        }
        media = [{
          id: `media:photo:landmark:${slug}`,
          kind: 'photo',
          url: `media/photos/landmarks/${slug}.webp`,
          source: 'Wikimedia Commons',
          source_url: source.source_url,
          author: source.author,
          license: source.license,
          license_url: source.license_url,
          attribution: `${source.author} · ${source.license} · ${source.source_url}`,
          caption: en,
        }]
        withPhoto++
      }
    } catch (error) {
      console.warn(`Foto ${slug} übersprungen: ${error.message}`)
    }
    const sourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(en.replaceAll(' ', '_'))}`
    landmarks.push({
      id: `landmark:${slug}`,
      type: 'landmark',
      names: { de, en },
      aliases: [],
      media,
      attributes: {
        country: country.id,
        continent,
        place_name: place,
        landmark_type: type,
      },
      provenance: {
        source: 'Wikipedia/Wikidata',
        source_url: sourceUrl,
        source_id: cache[slug]?.wikidata,
        imported_at: new Date().toISOString().slice(0, 10),
      },
    })
  }
} finally {
  rmSync(temp, { recursive: true, force: true })
}

landmarks.sort((a, b) => a.id.localeCompare(b.id))
writeJson(join(DATA, 'entities', 'landmarks.json'), landmarks)

const relationshipsPath = join(DATA, 'relationships', 'index.json')
const relationships = readJson(relationshipsPath).filter((relationship) => !expansionIds.has(relationship.from))
for (const landmark of landmarks.filter((item) => expansionIds.has(item.id))) {
  relationships.push({ from: landmark.id, to: landmark.attributes.country, type: 'located_in' })
  const city = cities.find(
    (item) => item.attributes.country === landmark.attributes.country &&
      [item.names.de, item.names.en, ...(item.aliases ?? [])].includes(landmark.attributes.place_name),
  )
  if (city) relationships.push({ from: landmark.id, to: city.id, type: 'located_in' })
}
writeJson(relationshipsPath, relationships)
console.log(`Sehenswürdigkeiten: +${ITEMS.length}, davon ${withPhoto} mit frei lizenziertem Foto`)
