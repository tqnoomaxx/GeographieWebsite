import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DATA, PUBLIC } from './lib/common.mjs'
const cards = JSON.parse(readFileSync(join(DATA, 'entities/language-courses.json'), 'utf8'))
const samples = JSON.parse(readFileSync(join(DATA, 'entities/language-samples.json'), 'utf8'))
const sources = []
const directory = join(PUBLIC, 'fonts/scripts')
mkdirSync(directory, { recursive: true })
for (const [code, family] of [
  ['zh', 'Noto Sans SC'],
  ['ja', 'Noto Sans JP'],
  ['ko', 'Noto Sans KR'],
]) {
  const text = [
    ...new Set(
      [...cards, ...samples]
        .filter((e) => e.attributes.language === code)
        .flatMap((e) => [...e.attributes.original]),
    ),
  ]
    .sort()
    .join('')
  const url = new URL('https://fonts.googleapis.com/css2')
  url.searchParams.set('family', `${family}:wght@500`)
  url.searchParams.set('text', text)
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    },
  })
  if (!response.ok) throw new Error(`Font CSS ${code}: ${response.status}`)
  const css = await response.text()
  const source = css.match(/src: url\(([^)]+)\) format\('(woff2|truetype)'\)/)
  if (!source) throw new Error(`Font URL missing: ${code}`)
  const font = await fetch(source[1])
  if (!font.ok) throw new Error(`Font ${code}: ${font.status}`)
  const extension = source[2] === 'woff2' ? 'woff2' : 'ttf'
  writeFileSync(
    join(directory, `noto-sans-${code}-course.${extension}`),
    Buffer.from(await font.arrayBuffer()),
  )
  sources.push({
    file: `noto-sans-${code}-course.${extension}`,
    source_url: source[1],
    license: 'SIL Open Font License 1.1',
    license_url: 'https://openfontlicense.org/',
    characters: text,
  })
  console.log(`${code}: ${text.length} Zeichen, ${extension}`)
}

writeFileSync(join(directory, 'COURSE-SOURCES.json'), JSON.stringify(sources, null, 2) + '\n')
