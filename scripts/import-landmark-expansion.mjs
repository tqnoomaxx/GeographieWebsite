// Ergänzt den kuratierten Altbestand um international bekannte Sehenswürdigkeiten.
// Fotos und Lizenzmetadaten kommen über die offiziellen MediaWiki-APIs von Wikipedia/Wikimedia Commons.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import { DATA, PUBLIC, ROOT, readJson, writeJson } from './lib/common.mjs'

const BASE_ITEMS = [
  ['schonbrunn', 'Schloss Schönbrunn', 'Schönbrunn Palace', 'AT', 'Wien', 'europe', 'palace'],
  [
    'neuschwanstein',
    'Schloss Neuschwanstein',
    'Neuschwanstein Castle',
    'DE',
    'Schwangau',
    'europe',
    'castle',
  ],
  ['brandenburg-gate', 'Brandenburger Tor', 'Brandenburg Gate', 'DE', 'Berlin', 'europe', 'monument'],
  ['charles-bridge', 'Karlsbrücke', 'Charles Bridge', 'CZ', 'Prag', 'europe', 'bridge'],
  ['prague-castle', 'Prager Burg', 'Prague Castle', 'CZ', 'Prag', 'europe', 'castle'],
  ['wawel-castle', 'Wawel-Schloss', 'Wawel Castle', 'PL', 'Krakau', 'europe', 'castle'],
  [
    'hungarian-parliament',
    'Ungarisches Parlamentsgebäude',
    'Hungarian Parliament Building',
    'HU',
    'Budapest',
    'europe',
    'building',
  ],
  [
    'dubrovnik-walls',
    'Stadtmauer von Dubrovnik',
    'Walls of Dubrovnik',
    'HR',
    'Dubrovnik',
    'europe',
    'fortification',
  ],
  ['tallinn-town-hall', 'Rathaus von Tallinn', 'Tallinn Town Hall', 'EE', 'Tallinn', 'europe', 'building'],
  ['rila-monastery', 'Kloster Rila', 'Rila Monastery', 'BG', 'Rila', 'europe', 'monastery'],
  ['saint-basils', 'Basilius-Kathedrale', "Saint Basil's Cathedral", 'RU', 'Moskau', 'europe', 'religious'],
  ['lake-bled', 'Bleder See', 'Lake Bled', 'SI', 'Bled', 'europe', 'landscape'],
  ['great-zimbabwe', 'Groß-Simbabwe', 'Great Zimbabwe', 'ZW', 'Masvingo', 'africa', 'archaeological'],
  ['hassan-ii-mosque', 'Hassan-II.-Moschee', 'Hassan II Mosque', 'MA', 'Casablanca', 'africa', 'religious'],
  ['casbah-algiers', 'Kasbah von Algier', 'Casbah of Algiers', 'DZ', 'Algier', 'africa', 'historic-quarter'],
  [
    'el-jem',
    'Amphitheater von El Djem',
    'Amphitheatre of El Jem',
    'TN',
    'El Djem',
    'africa',
    'archaeological',
  ],
  ['stone-town', 'Stone Town', 'Stone Town', 'TZ', 'Sansibar-Stadt', 'africa', 'historic-quarter'],
  [
    'djenne-mosque',
    'Große Moschee von Djenné',
    'Great Mosque of Djenné',
    'ML',
    'Djenné',
    'africa',
    'religious',
  ],
  ['le-morne', 'Le Morne Brabant', 'Le Morne Brabant', 'MU', 'Le Morne', 'africa', 'cultural-landscape'],
  ['union-buildings', 'Union Buildings', 'Union Buildings', 'ZA', 'Pretoria', 'africa', 'building'],
  ['burj-khalifa', 'Burj Khalifa', 'Burj Khalifa', 'AE', 'Dubai', 'asia', 'building'],
  [
    'sheikh-zayed-mosque',
    'Scheich-Zayid-Moschee',
    'Sheikh Zayed Grand Mosque',
    'AE',
    'Abu Dhabi',
    'asia',
    'religious',
  ],
  ['petronas-towers', 'Petronas Towers', 'Petronas Towers', 'MY', 'Kuala Lumpur', 'asia', 'building'],
  ['gardens-by-the-bay', 'Gardens by the Bay', 'Gardens by the Bay', 'SG', 'Singapur', 'asia', 'garden'],
  ['merlion', 'Merlion', 'Merlion', 'SG', 'Singapur', 'asia', 'monument'],
  ['forbidden-city', 'Verbotene Stadt', 'Forbidden City', 'CN', 'Peking', 'asia', 'palace'],
  ['terracotta-army', 'Terrakotta-Armee', 'Terracotta Army', 'CN', 'Xi’an', 'asia', 'archaeological'],
  ['potala-palace', 'Potala-Palast', 'Potala Palace', 'CN', 'Lhasa', 'asia', 'palace'],
  ['gyeongbokgung', 'Gyeongbokgung-Palast', 'Gyeongbokgung', 'KR', 'Seoul', 'asia', 'palace'],
  ['grand-palace-bangkok', 'Großer Palast von Bangkok', 'Grand Palace', 'TH', 'Bangkok', 'asia', 'palace'],
  ['bagan', 'Tempelstadt Bagan', 'Bagan', 'MM', 'Bagan', 'asia', 'archaeological'],
  ['shwedagon', 'Shwedagon-Pagode', 'Shwedagon Pagoda', 'MM', 'Yangon', 'asia', 'religious'],
  ['sigiriya', 'Felsenfestung Sigiriya', 'Sigiriya', 'LK', 'Sigiriya', 'asia', 'archaeological'],
  ['registan', 'Registan', 'Registan', 'UZ', 'Samarkand', 'asia', 'square'],
  ['persepolis', 'Persepolis', 'Persepolis', 'IR', 'Persepolis', 'asia', 'archaeological'],
  [
    'golden-gate',
    'Golden Gate Bridge',
    'Golden Gate Bridge',
    'US',
    'San Francisco',
    'north-america',
    'bridge',
  ],
  [
    'empire-state',
    'Empire State Building',
    'Empire State Building',
    'US',
    'New York City',
    'north-america',
    'building',
  ],
  ['cn-tower', 'CN Tower', 'CN Tower', 'CA', 'Toronto', 'north-america', 'tower'],
  ['parliament-hill', 'Parliament Hill', 'Parliament Hill', 'CA', 'Ottawa', 'north-america', 'building'],
  ['teotihuacan', 'Teotihuacán', 'Teotihuacan', 'MX', 'Teotihuacán', 'north-america', 'archaeological'],
  ['havana-capitol', 'Kapitol von Havanna', 'El Capitolio', 'CU', 'Havanna', 'north-america', 'building'],
  ['panama-canal', 'Panamakanal', 'Panama Canal', 'PA', 'Panama-Stadt', 'north-america', 'engineering'],
  [
    'buenos-aires-obelisk',
    'Obelisk von Buenos Aires',
    'Obelisco de Buenos Aires',
    'AR',
    'Buenos Aires',
    'south-america',
    'monument',
  ],
  ['salar-de-uyuni', 'Salar de Uyuni', 'Salar de Uyuni', 'BO', 'Uyuni', 'south-america', 'landscape'],
  [
    'sydney-harbour-bridge',
    'Sydney Harbour Bridge',
    'Sydney Harbour Bridge',
    'AU',
    'Sydney',
    'oceania',
    'bridge',
  ],
  [
    'parliament-house-canberra',
    'Parliament House',
    'Parliament House, Canberra',
    'AU',
    'Canberra',
    'oceania',
    'building',
  ],
  ['auckland-sky-tower', 'Sky Tower Auckland', 'Sky Tower (Auckland)', 'NZ', 'Auckland', 'oceania', 'tower'],
  ['nan-madol', 'Nan Madol', 'Nan Madol', 'FM', 'Pohnpei', 'oceania', 'archaeological'],
  ['bikini-atoll', 'Bikini-Atoll', 'Bikini Atoll', 'MH', 'Bikini-Atoll', 'oceania', 'cultural-landscape'],
  ['rock-islands', 'Rock Islands', 'Rock Islands', 'PW', 'Koror', 'oceania', 'cultural-landscape'],
  ['atomium', 'Atomium', 'Atomium', 'BE', 'Brüssel', 'europe', 'monument'],
  ['hallgrimskirkja', 'Hallgrímskirkja', 'Hallgrímskirkja', 'IS', 'Reykjavík', 'europe', 'religious'],
  [
    'palace-culture-warsaw',
    'Kultur- und Wissenschaftspalast',
    'Palace of Culture and Science',
    'PL',
    'Warschau',
    'europe',
    'building',
  ],
  ['chain-bridge', 'Kettenbrücke', 'Széchenyi Chain Bridge', 'HU', 'Budapest', 'europe', 'bridge'],
  [
    'little-mermaid',
    'Die kleine Meerjungfrau',
    'The Little Mermaid (statue)',
    'DK',
    'Kopenhagen',
    'europe',
    'monument',
  ],
  ['table-mountain', 'Tafelberg', 'Table Mountain', 'ZA', 'Kapstadt', 'africa', 'landscape'],
  [
    'african-renaissance',
    'Monument der afrikanischen Renaissance',
    'African Renaissance Monument',
    'SN',
    'Dakar',
    'africa',
    'monument',
  ],
  ['independence-arch', 'Independence Arch', 'Independence Arch', 'GH', 'Accra', 'africa', 'monument'],
  [
    'kigali-memorial',
    'Kigali Genocide Memorial',
    'Kigali Genocide Memorial',
    'RW',
    'Kigali',
    'africa',
    'memorial',
  ],
  ['taipei-101', 'Taipei 101', 'Taipei 101', 'TW', 'Taipeh', 'asia', 'skyscraper'],
  ['marina-bay-sands', 'Marina Bay Sands', 'Marina Bay Sands', 'SG', 'Singapur', 'asia', 'building'],
  ['tokyo-skytree', 'Tokyo Skytree', 'Tokyo Skytree', 'JP', 'Tokio', 'asia', 'tower'],
  [
    'itsukushima-shrine',
    'Itsukushima-Schrein',
    'Itsukushima Shrine',
    'JP',
    'Hatsukaichi',
    'asia',
    'religious',
  ],
  ['hawa-mahal', 'Hawa Mahal', 'Hawa Mahal', 'IN', 'Jaipur', 'asia', 'palace'],
  ['gateway-india', 'Gateway of India', 'Gateway of India', 'IN', 'Mumbai', 'asia', 'monument'],
  ['lotus-temple', 'Lotustempel', 'Lotus Temple', 'IN', 'Neu-Delhi', 'asia', 'religious'],
  ['wat-arun', 'Wat Arun', 'Wat Arun', 'TH', 'Bangkok', 'asia', 'religious'],
  ['monas', 'Nationalmonument Monas', 'National Monument (Indonesia)', 'ID', 'Jakarta', 'asia', 'monument'],
  [
    'independence-monument-cambodia',
    'Unabhängigkeitsdenkmal Phnom Penh',
    'Independence Monument, Phnom Penh',
    'KH',
    'Phnom Penh',
    'asia',
    'monument',
  ],
  [
    'bahrain-world-trade-center',
    'Bahrain World Trade Center',
    'Bahrain World Trade Center',
    'BH',
    'Manama',
    'asia',
    'skyscraper',
  ],
  [
    'sultan-qaboos-mosque',
    'Sultan-Qabus-Moschee',
    'Sultan Qaboos Grand Mosque',
    'OM',
    'Maskat',
    'asia',
    'religious',
  ],
  [
    'dongdaemun-design-plaza',
    'Dongdaemun Design Plaza',
    'Dongdaemun Design Plaza',
    'KR',
    'Seoul',
    'asia',
    'building',
  ],
  ['space-needle', 'Space Needle', 'Space Needle', 'US', 'Seattle', 'north-america', 'tower'],
  ['mount-rushmore', 'Mount Rushmore', 'Mount Rushmore', 'US', 'Keystone', 'north-america', 'monument'],
  ['gateway-arch', 'Gateway Arch', 'Gateway Arch', 'US', 'St. Louis', 'north-america', 'monument'],
  [
    'angel-independence',
    'El Ángel de la Independencia',
    'Angel of Independence',
    'MX',
    'Mexiko-Stadt',
    'north-america',
    'monument',
  ],
  [
    'chateau-frontenac',
    'Château Frontenac',
    'Château Frontenac',
    'CA',
    'Québec',
    'north-america',
    'building',
  ],
  ['casa-rosada', 'Casa Rosada', 'Casa Rosada', 'AR', 'Buenos Aires', 'south-america', 'building'],
  ['palacio-salvo', 'Palacio Salvo', 'Palacio Salvo', 'UY', 'Montevideo', 'south-america', 'building'],
  ['angel-falls', 'Salto Ángel', 'Angel Falls', 'VE', 'Canaima-Nationalpark', 'south-america', 'landscape'],
  [
    'twelve-apostles',
    'Twelve Apostles',
    'The Twelve Apostles (Victoria)',
    'AU',
    'Victoria',
    'oceania',
    'landscape',
  ],
  ['beehive-wellington', 'Beehive', 'Beehive (New Zealand)', 'NZ', 'Wellington', 'oceania', 'building'],
]

const extraItems = readJson(join(ROOT, 'scripts/content/landmark-expansion.json'))
const photoOverrides = readJson(join(ROOT, 'scripts/content/landmark-photo-overrides.json'))
const initialLandmarks = readJson(join(DATA, 'entities/landmarks.json'))
const byInitialId = new Map(initialLandmarks.map((item) => [item.id, item]))
const ITEMS = [
  ...BASE_ITEMS,
  ...extraItems.map((item) => [item.id, item.de, item.en, item.iso2, item.place, item.continent, item.type]),
]
const photoRequests = [...ITEMS]
for (const slug of Object.keys(photoOverrides)) {
  if (photoRequests.some(([id]) => id === slug)) continue
  const item = byInitialId.get(`landmark:${slug}`)
  if (item) photoRequests.push([slug, item.names.de, item.names.en])
}

// PageImages can choose a company logo or a location map. Picture questions need a real motif.
const unsuitablePhoto = (filename = '') =>
  /\.(?:svg|pdf)$/i.test(filename) ||
  /banknote|\d+[ _-]?riels?/i.test(filename) ||
  /(?:^|[ _-])(logo|icon|locator|map|flag|coat(?:_of_arms)?|seal|plan|diagram)(?:[ _.-]|$)/i.test(filename)
const approvedLicense = (license = '') =>
  !/\b(?:NC|ND)\b/i.test(license) &&
  /^(?:CC[ -]BY(?:[ -]SA)?|CC0|Public domain|PD-|FAL|GFDL|KOGL Type 1$)/i.test(license)
const tomorrow = (date) => new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)

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
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AtlasfunkeImporter/0.1 (educational geography data)' },
    })
    if (response.ok) return response.json()
    if (response.status !== 429) throw new Error(`${response.status} ${url}`)
    await pause(1200 * (attempt + 1))
  }
  throw new Error(`429 ${url}`)
}

async function download(url) {
  const original = new URL(url)
  const isThumbnail = original.pathname.includes('/thumb/')
  if (isThumbnail) {
    original.hostname = 'upload.wikimedia.org'
    original.pathname = original.pathname.replace('/thumb/', '/')
    original.pathname = original.pathname.slice(0, original.pathname.lastIndexOf('/'))
    original.search = ''
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AtlasfunkeImporter/0.1 (educational geography data)' },
    })
    if (response.ok) return response.arrayBuffer()
    if (response.status !== 429) throw new Error(`Bild ${response.status}`)
    if (isThumbnail) {
      const fallback = await fetch(original, {
        headers: { 'User-Agent': 'AtlasfunkeImporter/0.1 (educational geography data)' },
      })
      if (fallback.ok) return fallback.arrayBuffer()
    }
    await pause(1500 * (attempt + 1))
  }
  throw new Error('Bild 429')
}

async function prefetchMissing() {
  const missing = photoRequests.filter(
    ([slug]) =>
      !cache[slug] ||
      unsuitablePhoto(cache[slug].filename) ||
      (slug in photoOverrides &&
        (!cache[slug].reviewed_at ||
          (photoOverrides[slug].filename && photoOverrides[slug].filename !== cache[slug].filename))),
  )
  if (!missing.length) return
  for (let offset = 0; offset < missing.length; offset += 40) {
    await prefetchBatch(missing.slice(offset, offset + 40))
  }
  writeJson(cachePath, cache)
}

async function prefetchBatch(missing) {
  const pageParams = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    redirects: '1',
    prop: 'pageimages|pageprops|coordinates',
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
    .map(([slug, , title]) => ({
      slug,
      page: pages.get(resolveTitle(title)) ?? {
        title,
        pageprops: { wikibase_item: photoOverrides[slug]?.wikidata },
      },
    }))
    .filter((item) => item.page?.pageprops?.wikibase_item || photoOverrides[item.slug]?.filename)
  if (!wanted.length) return
  const wikidataParams = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    props: 'claims|descriptions',
    languages: 'de',
    ids: wanted
      .map(({ page }) => page.pageprops?.wikibase_item)
      .filter(Boolean)
      .join('|'),
  })
  const wikidata = wikidataParams.get('ids')
    ? await json(`https://www.wikidata.org/w/api.php?${wikidataParams}`)
    : {}
  for (const item of wanted) {
    const entity = wikidata.entities?.[item.page.pageprops?.wikibase_item]
    const pictures = (entity?.claims?.P18 ?? []).filter((claim) => claim.rank !== 'deprecated')
    item.filename =
      photoOverrides[item.slug]?.filename ||
      pictures.find(
        (claim) => claim.rank === 'preferred' && !unsuitablePhoto(claim.mainsnak.datavalue?.value),
      )?.mainsnak.datavalue?.value ||
      pictures.find((claim) => !unsuitablePhoto(claim.mainsnak.datavalue?.value))?.mainsnak.datavalue
        ?.value ||
      (!unsuitablePhoto(item.page.pageimage) ? item.page.pageimage : undefined)
    item.description_de = photoOverrides[item.slug]?.description_de ?? entity?.descriptions?.de?.value
    item.coordinates = item.page.coordinates?.[0]
  }
  const photos = wanted.filter((item) => item.filename && !unsuitablePhoto(item.filename))
  if (!photos.length) return
  const commonsParams = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|user',
    iiurlwidth: '1600',
    titles: photos.map((item) => `File:${item.filename}`).join('|'),
  })
  const commonsData = await json(`https://commons.wikimedia.org/w/api.php?${commonsParams}`)
  const fileKey = (title) => title.replaceAll('_', ' ').normalize('NFC').toLocaleLowerCase('en-US')
  const commonsPages = new Map(
    Object.values(commonsData.query?.pages ?? {}).map((page) => [fileKey(page.title), page]),
  )
  // Some CC-licensed photographs are stored locally on English Wikipedia, rather than Commons.
  const local = photos.filter((item) => !commonsPages.get(fileKey(`File:${item.filename}`))?.imageinfo)
  let localPages = new Map()
  if (local.length) {
    commonsParams.set('titles', local.map((item) => `File:${item.filename}`).join('|'))
    const localData = await json(`https://en.wikipedia.org/w/api.php?${commonsParams}`)
    localPages = new Map(
      Object.values(localData.query?.pages ?? {}).map((page) => [fileKey(page.title), page]),
    )
  }
  for (const { slug, page, filename, description_de, coordinates } of photos) {
    const commonsPage = commonsPages.get(fileKey(`File:${filename}`))
    const localPage = localPages.get(fileKey(`File:${filename}`))
    const info = commonsPage?.imageinfo?.[0] ?? localPage?.imageinfo?.[0]
    if (!info?.thumburl && !info?.url) continue
    const ext = info.extmetadata ?? {}
    const license = plain(ext.LicenseShortName?.value || ext.UsageTerms?.value)
    if (!approvedLicense(license)) continue
    const usage_note = /All free in US media|Wikipedia files not suitable for Commons/i.test(
      ext.Categories?.value ?? '',
    )
      ? 'Die Quelldatei ist auf der englischen Wikipedia als in den USA frei gekennzeichnet; der Status des abgebildeten Werkes kann in anderen Ländern abweichen.'
      : undefined
    cache[slug] = {
      wikidata: photoOverrides[slug]?.wikidata ?? page.pageprops?.wikibase_item,
      filename,
      download_url: info.thumburl || info.url,
      source_url:
        info.descriptionurl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`,
      author: plain(ext.Artist?.value) || 'Autor siehe Quellseite',
      license,
      license_url: ext.LicenseUrl?.value,
      source: commonsPage?.imageinfo ? 'Wikimedia Commons' : 'Wikipedia (englisch)',
      usage_note,
      width: info.width,
      height: info.height,
      description_de,
      location: coordinates ? { lat: coordinates.lat, lon: coordinates.lon } : undefined,
      reviewed_at: '2026-10-13',
      daily_available_from:
        byInitialId.get(`landmark:${slug}`)?.attributes.daily_available_from ??
        (!byInitialId.get(`landmark:${slug}`)?.media?.some((item) => item.kind === 'photo')
          ? tomorrow('2026-10-13')
          : undefined),
      asset_version: createHash('sha256').update(filename).digest('hex').slice(0, 10),
    }
  }
}

const countries = readJson(join(DATA, 'entities', 'countries.json'))
const countryByIso = new Map(countries.map((country) => [country.attributes.iso2, country]))
const cities = readJson(join(DATA, 'entities', 'cities.json'))
const legacy = readJson(join(DATA, 'entities', 'landmarks.json'))
const expansionIds = new Set(ITEMS.map(([slug]) => `landmark:${slug}`))
const landmarks = legacy.filter((item) => !expansionIds.has(item.id))
let withPhoto = 0

async function photoFor(slug) {
  const source = cache[slug]
  if (!source || unsuitablePhoto(source.filename) || !approvedLicense(source.license)) return []
  const name = `${slug}${source.asset_version ? `-${source.asset_version}` : ''}.webp`
  const output = join(outDir, name)
  if (!existsSync(output)) {
    const extension = extname(new URL(source.download_url).pathname).slice(0, 8) || '.img'
    const input = join(temp, `${slug}${extension}`)
    writeFileSync(input, Buffer.from(await download(source.download_url)))
    const portrait = source.height > source.width
    execFileSync('cwebp', [
      '-quiet',
      '-q',
      '82',
      '-resize',
      portrait ? '0' : '1600',
      portrait ? '1600' : '0',
      input,
      '-o',
      output,
    ])
  }
  return [
    {
      id: `media:photo:landmark:${slug}`,
      kind: 'photo',
      url: `media/photos/landmarks/${name}`,
      source: source.source ?? 'Wikimedia Commons',
      source_url: source.source_url,
      author: source.author,
      license: source.license,
      license_url: source.license_url,
      attribution: `${source.author} · ${source.license} · ${source.source_url}${source.usage_note ? ` · ${source.usage_note}` : ''}`,
      usage_note: source.usage_note,
    },
  ]
}

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
      media = await photoFor(slug)
      if (media.length) withPhoto++
    } catch (error) {
      console.warn(`Foto ${slug} übersprungen: ${error.message}`)
    }
    const sourceUrl =
      photoOverrides[slug]?.source_url ??
      `https://en.wikipedia.org/wiki/${encodeURIComponent(en.replaceAll(' ', '_'))}`
    const previous = byInitialId.get(`landmark:${slug}`)
    const extra = extraItems.find((item) => item.id === slug)
    landmarks.push({
      id: `landmark:${slug}`,
      type: 'landmark',
      names: { de, en },
      aliases: previous?.aliases ?? extra?.aliases ?? [],
      location: cache[slug]?.location ?? previous?.location,
      media,
      attributes: {
        ...previous?.attributes,
        country: country.id,
        continent,
        place_name: place,
        landmark_type: type,
        description_de: cache[slug]?.description_de,
        daily_available_from:
          previous?.attributes.daily_available_from ??
          cache[slug]?.daily_available_from ??
          (extra?.introduced_at ? tomorrow(extra.introduced_at) : undefined),
      },
      provenance: {
        source: photoOverrides[slug]?.source ?? 'Wikipedia/Wikidata',
        source_url: sourceUrl,
        source_id: cache[slug]?.wikidata,
        imported_at: new Date().toISOString().slice(0, 10),
      },
    })
  }
  for (const landmark of landmarks.filter(
    (item) => item.id.slice(9) in photoOverrides && !expansionIds.has(item.id),
  )) {
    try {
      const media = await photoFor(landmark.id.slice(9))
      if (media.length) landmark.media = media
    } catch (error) {
      console.warn(`Foto ${landmark.id} nicht ersetzt: ${error.message}`)
    }
  }
} finally {
  rmSync(temp, { recursive: true, force: true })
}

landmarks.sort((a, b) => a.id.localeCompare(b.id))
writeJson(join(DATA, 'entities', 'landmarks.json'), landmarks)

const relationshipsPath = join(DATA, 'relationships', 'index.json')
const relationships = readJson(relationshipsPath).filter(
  (relationship) => !expansionIds.has(relationship.from),
)
for (const landmark of landmarks.filter((item) => expansionIds.has(item.id))) {
  relationships.push({ from: landmark.id, to: landmark.attributes.country, type: 'located_in' })
  const city = cities.find(
    (item) =>
      item.attributes.country === landmark.attributes.country &&
      [item.names.de, item.names.en, ...(item.aliases ?? [])].includes(landmark.attributes.place_name),
  )
  if (city) relationships.push({ from: landmark.id, to: city.id, type: 'located_in' })
}
writeJson(relationshipsPath, relationships)
console.log(
  `Sehenswürdigkeiten: ${landmarks.length} insgesamt, ${withPhoto}/${ITEMS.length} Import-Fotos; ${Object.keys(photoOverrides).length} kuratierte Fotokorrekturen`,
)
