import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA, ROOT, CACHE, writeJson } from './lib/common.mjs'
import { languageCatalog } from './content/language-catalog.mjs'
import { courseAlphabets } from './content/course-alphabets.mjs'

const revision = '7d2b9cb11cec08f4d333ad73209deb3df0711c3b'
const groups = {
  Tiere:
    '🐕 🐈 🐎 🐄 🐖 🐑 🐐 🐔 🐓 🦆 🐦 🐟 🐬 🐳 🦈 🐘 🦒 🐒 🦍 🦁 🐅 🐻 🐼 🦊 🐺 🐇 🐁 🐢 🐍 🐸 🦋 🐝 🐜 🐞 🦀 🐙 🦉 🦇 🦔 🦘',
  'Essen & Trinken':
    '🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🍑 🍍 🥭 🥝 🥑 🍅 🍆 🥕 🌽 🥔 🥒 🥦 🧄 🧅 🥜 🌰 🍞 🥐 🧀 🥚 🥞 🍔 🍟 🍕 🌭 🥪 🌮 🍚 🍜 🍝 🍣 🍤 🍦 🍰 🍫 🍿 🍪 🍯 🥛 ☕ 🍵',
  'Natur & Wetter': '🌳 🌲 🌴 🌵 🌷 🌹 🌻 🌼 🌸 🍀 🍁 🍄 🌍 🌙 ⭐ ☀ 🌧 ❄ 🔥 🌊 🌈 🌋 🏔 🏝 🏜',
  Unterwegs:
    '🚗 🚕 🚌 🚎 🚓 🚑 🚒 🚚 🚲 🛵 🏍 🚂 🚆 🚇 🚊 🚉 ✈ 🚁 🚀 🚢 ⛵ 🚤 ⚓ ⛽ 🚦 🛣 🏠 🏫 🏥 🏦 🏨 🏰 ⛺ 🗺 🧭 🧳',
  Alltag:
    '⌚ ⏰ 📱 ☎ 💻 ⌨ 🖨 📷 📺 📻 💡 🔦 📕 📖 📝 ✏ ✒ 📏 ✂ 🔑 🔒 🔨 🔧 🪛 🪑 🚪 🛏 🛁 🧹 🧺 🧼 🪥 🧦 👟 👞 👕 👖 👗 👒 🧤 🧣 👓 ☂ 🎒 🎁 🎈 ⚽ 🏀 🎾 🎸 🎹 🎻 🥁 🎨',
}
const legacy = JSON.parse(readFileSync(join(DATA, 'entities/script-words.json'), 'utf8'))
const cache = join(CACHE, 'language-courses', revision)
mkdirSync(cache, { recursive: true })
async function annotations(code) {
  const file = join(cache, code + '.json')
  if (!existsSync(file)) {
    const response = await fetch(
      `https://raw.githubusercontent.com/unicode-org/cldr-json/${revision}/cldr-json/cldr-annotations-full/annotations/${code}/annotations.json`,
    )
    if (!response.ok) throw new Error(`${code}: CLDR ${response.status}`)
    writeFileSync(file, await response.text())
  }
  return JSON.parse(readFileSync(file, 'utf8')).annotations.annotations
}
const german = await annotations('de')
const entities = []
const courses = []
for (const language of languageCatalog) {
  const local = await annotations(language.language)
  const code = language.language
  const letters =
    courseAlphabets[code] ??
    legacy
      .filter((e) => e.attributes.language === code && e.attributes.kind === 'letter')
      .map((e) => [e.attributes.original, e.attributes.transliteration])
  const additions = {
    ru: [
      ['ъ', 'Hartzeichen'],
      ['ь', 'Weichheitszeichen'],
    ],
    ar: [
      ['ا', 'alif'],
      ['ح', 'ha'],
      ['ص', 'sad'],
      ['ض', 'dad'],
      ['ط', 'ta'],
      ['ظ', 'za'],
      ['ع', 'ayn'],
      ['غ', 'ghayn'],
    ],
    hi: [
      ['ऋ', 'ri'],
      ['ङ', 'nga'],
      ['ञ', 'nya'],
      ['ट', 'tta'],
      ['ठ', 'ttha'],
      ['ड', 'dda'],
      ['ढ', 'ddha'],
      ['ण', 'nna'],
      ['त', 'ta'],
      ['थ', 'tha'],
      ['द', 'da'],
      ['ध', 'dha'],
      ['ष', 'ssa'],
    ],
    bn: [
      ['ঋ', 'ri'],
      ['ঙ', 'nga'],
      ['ঞ', 'nya'],
      ['ট', 'tta'],
      ['ঠ', 'ttha'],
      ['ড', 'dda'],
      ['ঢ', 'ddha'],
      ['ণ', 'nna'],
      ['ত', 'ta'],
      ['থ', 'tha'],
      ['দ', 'da'],
      ['ধ', 'dha'],
      ['য', 'ya'],
      ['শ', 'sha'],
      ['ষ', 'ssa'],
      ['ড়', 'rra'],
      ['ঢ়', 'rrha'],
      ['য়', 'yya'],
      ['ৎ', 'khanda ta'],
      ['ং', 'anusvara'],
      ['ঃ', 'visarga'],
      ['ঁ', 'chandrabindu'],
    ],
    ta: [['ஃ', 'aytam']],
    fr: [
      ['É', 'é'],
      ['È', 'è'],
      ['Ê', 'ê'],
      ['Ë', 'ë'],
      ['À', 'à'],
      ['Â', 'â'],
      ['Î', 'î'],
      ['Ï', 'ï'],
      ['Ô', 'ô'],
      ['Ù', 'ù'],
      ['Û', 'û'],
      ['Ü', 'ü'],
      ['Ç', 'cédille'],
      ['Œ', 'e dans o'],
      ['Æ', 'e dans a'],
    ],
    pt: [
      ['Ã', 'ã'],
      ['Õ', 'õ'],
      ['Ç', 'cê cedilhado'],
      ['Á', 'á'],
      ['À', 'à'],
      ['Â', 'â'],
      ['É', 'é'],
      ['Ê', 'ê'],
      ['Í', 'í'],
      ['Ó', 'ó'],
      ['Ô', 'ô'],
      ['Ú', 'ú'],
    ],
  }
  letters.push(...(additions[code] ?? []))
  if (code === 'ar')
    letters.sort(
      (a, b) =>
        [...'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'].indexOf(a[0]) - [...'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'].indexOf(b[0]),
    )
  const alphabetTitle =
    code === 'zh'
      ? 'Zeichen & Pinyin'
      : code === 'ja'
        ? 'Hiragana & Katakana'
        : code === 'ko'
          ? 'Hangul-Alphabet'
          : 'Alphabet & Schrift'
  const script = language.script.toLowerCase()
  const common = {
    course: true,
    language: code,
    language_name: language.name,
    script,
    script_name: language.scriptName,
    direction: language.direction,
  }
  letters.forEach(([original, label], i) =>
    entities.push({
      id: `script_word:course-${code}-letter-${i + 1}`,
      type: 'script_word',
      names: { de: original },
      attributes: {
        ...common,
        kind: 'letter',
        original,
        transliteration: label,
        accepted: [label],
        topic: alphabetTitle,
      },
      provenance: {
        source: 'Atlasfunke Lernredaktion · Schriftgrundlagen',
        source_url: 'https://cldr.unicode.org/index/cldr-spec/transliteration-guidelines',
        license: 'CC BY 4.0',
        imported_at: '2026-10-30',
      },
    }),
  )
  const seen = new Set()
  let count = 0
  for (const [topic, emoji] of Object.entries(groups))
    for (const symbol of emoji.split(' ')) {
      const original = local[symbol]?.tts?.[0]
      const meaning = german[symbol]?.tts?.[0]
      if (!original || !meaning || seen.has(original)) continue
      seen.add(original)
      const key = [...symbol].map((c) => c.codePointAt(0).toString(16)).join('-')
      entities.push({
        id: `script_word:course-${code}-word-${key}`,
        type: 'script_word',
        names: { de: original },
        attributes: { ...common, kind: 'word', original, meaning, topic, symbol },
        provenance: {
          source: 'Unicode CLDR · Alltagswortschatz',
          source_url: `https://github.com/unicode-org/cldr-json/blob/${revision}/cldr-json/cldr-annotations-full/annotations/${code}/annotations.json`,
          license: 'Unicode-3.0',
          imported_at: '2026-10-30',
        },
      })
      count++
    }
  if (letters.length < 20 || count < 150)
    throw new Error(`${code}: unzureichender Lernumfang (${letters.length}/${count})`)
  courses.push({ code, name: language.name, alphabetTitle, letters: letters.length, words: count })
}
writeJson(join(DATA, 'entities/language-courses.json'), entities)
writeJson(join(ROOT, 'src/config/languageCourses.json'), courses)
console.log(`Sprachkurse: ${courses.length} Sprachen · ${entities.length} Karten`)
