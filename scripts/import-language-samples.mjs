// Pinned primary UDHR-in-XML texts; normal imports use the reviewed snapshot offline.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { CACHE, DATA, ROOT, readJson, writeJson } from './lib/common.mjs'
import { languageCatalog, UDHR_REVISION } from './content/language-catalog.mjs'

const snapshotPath = join(ROOT, 'scripts/data/language-samples.json')
const base = `https://raw.githubusercontent.com/eric-muller/udhr/${UDHR_REVISION}/data/udhr/`
const clean = (text) =>
  text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
const articleText = (xml, number) => {
  const article = xml.match(new RegExp(`<article number=["']${number}["'][^>]*>([\\s\\S]*?)</article>`))?.[1]
  const paragraphs = [...(article ?? '').matchAll(/<para(?:\s[^>]*)?>([\s\S]*?)<\/para>/g)]
  if (!paragraphs.length) throw new Error(`UDHR article ${number} missing`)
  return paragraphs.map((match) => clean(match[1])).join(' ')
}

if (process.argv.includes('--refresh') || !existsSync(snapshotPath)) {
  const texts = await Promise.all(
    languageCatalog.map(async (language) => {
      const url = `${base}udhr_${language.file}.xml`
      const cache = join(CACHE, `udhr-${UDHR_REVISION}-${language.file}.json`)
      if (!existsSync(cache)) {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`${url}: ${response.status}`)
        writeJson(cache, { xml: await response.text() })
      }
      const { xml } = readJson(cache)
      return {
        ...language,
        url,
        texts: [1, 3, 24].map((article) => ({ article, text: articleText(xml, article) })),
      }
    }),
  )
  const german = texts.find((language) => language.language === 'de')
  const samples = texts.flatMap((language) =>
    language.texts.map(({ article, text }) => ({
      id: `language_sample:${language.language}-${article}`,
      type: 'language_sample',
      names: { de: text },
      attributes: {
        language: language.language,
        language_name: language.name,
        language_aliases: language.aliases,
        script: language.script,
        script_name: language.scriptName,
        direction: language.direction,
        original: text,
        meaning: german.texts.find((entry) => entry.article === article).text,
        article,
        hint: language.hint,
      },
      provenance: {
        source: 'UN/OHCHR · UDHR in XML (Eric Muller)',
        source_url: language.url,
        source_id: `UDHR-${language.file}-${article}`,
        imported_at: '2026-10-28',
        license: 'UN/OHCHR translation; source attribution',
      },
    })),
  )
  writeJson(snapshotPath, samples)
}
const samples = readJson(snapshotPath)
writeJson(join(DATA, 'entities/language-samples.json'), samples)
console.log(
  `Sprach-Textproben: ${samples.length} in ${new Set(samples.map((sample) => sample.attributes.language)).size} Sprachen`,
)
