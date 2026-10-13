// Kuratierte Nationaltiere und Nationalblumen. Nur klar belegte amtliche oder fest etablierte
// Nationalsymbole werden aufgenommen; der Status bleibt in den Daten sichtbar.
import { join } from 'node:path'
import { DATA, ROOT, readJson, writeJson } from './lib/common.mjs'

const WD = (qid) => `https://www.wikidata.org/wiki/${qid}`
const wikidata = (name, scientific_name, status = 'established', qid) => ({
  name,
  scientific_name,
  status,
  source: 'Wikidata (CC0)',
  source_url: WD(qid),
})
const official = (name, scientific_name, source, source_url) => ({
  name,
  scientific_name,
  status: 'official',
  source,
  source_url,
})

const symbols = {
  AR: {
    national_animal: wikidata('Rosttöpfer', 'Furnarius rufus', 'official', 'Q414'),
    national_flower: wikidata('Ceibo', 'Erythrina crista-galli', 'official', 'Q414'),
  },
  AU: {
    national_flower: official(
      'Gold-Akazie',
      'Acacia pycnantha',
      'Australian Government',
      'https://www.pmc.gov.au/government/australian-national-symbols/australian-floral-emblem',
    ),
  },
  BD: {
    national_animal: wikidata('Bengaltiger', 'Panthera tigris tigris', 'official', 'Q902'),
    national_flower: wikidata('Stern-Seerose', 'Nymphaea nouchali', 'official', 'Q902'),
  },
  BR: {
    national_animal: wikidata('Jaguar', 'Panthera onca', 'established', 'Q155'),
    national_flower: wikidata('Gelber Trompetenbaum', 'Handroanthus albus', 'official', 'Q155'),
  },
  BT: {
    national_animal: wikidata('Takin', 'Budorcas taxicolor', 'official', 'Q917'),
    national_flower: wikidata('Himalaja-Scheinmohn', 'Meconopsis gakyidiana', 'official', 'Q917'),
  },
  CA: {
    national_animal: official(
      'Kanadischer Biber',
      'Castor canadensis',
      'Government of Canada',
      'https://www.canada.ca/en/canadian-heritage/services/official-symbols-canada.html',
    ),
  },
  CL: {
    national_animal: wikidata('Huemul', 'Hippocamelus bisulcus', 'established', 'Q298'),
    national_flower: wikidata('Chilenische Wachsglocke', 'Lapageria rosea', 'official', 'Q298'),
  },
  CO: {
    national_animal: wikidata('Andenkondor', 'Vultur gryphus', 'established', 'Q739'),
    national_flower: wikidata('Cattleya trianae', 'Cattleya trianae', 'official', 'Q739'),
  },
  CR: {
    national_animal: wikidata('Weißwedelhirsch', 'Odocoileus virginianus', 'official', 'Q800'),
    national_flower: wikidata('Guaria morada', 'Guarianthe skinneri', 'official', 'Q800'),
  },
  EE: {
    national_animal: wikidata('Wolf', 'Canis lupus', 'official', 'Q191'),
    national_flower: wikidata('Kornblume', 'Centaurea cyanus', 'established', 'Q191'),
  },
  FI: {
    national_animal: wikidata('Braunbär', 'Ursus arctos', 'established', 'Q33'),
    national_flower: wikidata('Maiglöckchen', 'Convallaria majalis', 'established', 'Q33'),
  },
  IN: {
    national_animal: official(
      'Bengaltiger',
      'Panthera tigris tigris',
      'National Portal of India',
      'https://knowindia.india.gov.in/national-identity-elements/national-animal.php',
    ),
    national_flower: official(
      'Indische Lotosblume',
      'Nelumbo nucifera',
      'National Portal of India',
      'https://knowindia.india.gov.in/national-identity-elements/national-flower.php',
    ),
  },
  ID: {
    national_animal: wikidata('Komodowaran', 'Varanus komodoensis', 'official', 'Q252'),
    national_flower: wikidata('Arabischer Jasmin', 'Jasminum sambac', 'official', 'Q252'),
  },
  JP: {
    national_animal: wikidata('Buntfasan', 'Phasianus versicolor', 'established', 'Q17'),
    national_flower: wikidata('Kirschblüte', 'Prunus serrulata', 'established', 'Q17'),
  },
  MU: {
    national_animal: wikidata('Mauritiusfalke', 'Falco punctatus', 'official', 'Q1027'),
    national_flower: wikidata('Boucle d’Oreille', 'Trochetia boutoniana', 'official', 'Q1027'),
  },
  MX: {
    national_animal: wikidata('Steinadler', 'Aquila chrysaetos', 'established', 'Q96'),
    national_flower: wikidata('Dahlie', 'Dahlia', 'official', 'Q96'),
  },
  NP: {
    national_animal: official(
      'Hausrind',
      'Bos taurus',
      'Verfassung Nepals',
      'https://lawcommission.gov.np/content/13437/nepal-s-constitution/',
    ),
    national_flower: official(
      'Baum-Rhododendron',
      'Rhododendron arboreum',
      'Verfassung Nepals',
      'https://lawcommission.gov.np/content/13437/nepal-s-constitution/',
    ),
  },
  NG: {
    national_animal: wikidata('Adler', 'Accipitridae', 'established', 'Q1033'),
    national_flower: wikidata('Gelbe Trompetenblume', 'Costus spectabilis', 'established', 'Q1033'),
  },
  PE: {
    national_animal: wikidata('Vikunja', 'Vicugna vicugna', 'established', 'Q419'),
    national_flower: wikidata('Kantuta', 'Cantua buxifolia', 'established', 'Q419'),
  },
  TH: {
    national_animal: wikidata('Asiatischer Elefant', 'Elephas maximus', 'official', 'Q869'),
    national_flower: wikidata('Röhren-Kassie', 'Cassia fistula', 'official', 'Q869'),
  },
  US: {
    national_animal: official(
      'Amerikanischer Bison',
      'Bison bison',
      'National Park Service',
      'https://www.nps.gov/subjects/bison/national-mammal.htm',
    ),
    national_flower: official(
      'Rose',
      'Rosa',
      'Proclamation 5574',
      'https://www.reaganlibrary.gov/archives/speech/proclamation-5574-national-floral-emblem-united-states-america',
    ),
  },
  ZA: {
    national_animal: official(
      'Springbock',
      'Antidorcas marsupialis',
      'South African Government',
      'https://www.gov.za/about-sa/national-symbols',
    ),
    national_flower: official(
      'Königsprotea',
      'Protea cynaroides',
      'South African Government',
      'https://www.gov.za/about-sa/national-symbols',
    ),
  },
}

const extra = readJson(join(ROOT, 'scripts/data/country-symbols-extra.json'))
const anthems = readJson(join(ROOT, 'scripts/data/country-anthems.json'))
const officialNames = readJson(join(ROOT, 'scripts/data/country-official-names.json'))
const path = join(DATA, 'entities', 'countries.json')
const countries = readJson(path)
const kinds = ['animal', 'bird', 'flower', 'tree', 'fish']
const legacyBirds = new Set(['AR', 'CO', 'JP', 'MU', 'MX', 'NG'])
const counts = Object.fromEntries(kinds.map((kind) => [kind, 0]))
for (const country of countries) {
  const iso = country.attributes.iso2
  const entry = symbols[iso]
  const catalog = Object.fromEntries(kinds.map((kind) => [kind, []]))
  const addLegacy = (kind, symbol) => {
    if (!symbol) return
    // A Wikidata link alone does not establish a legal/official designation.
    catalog[kind].push({
      ...symbol,
      status: symbol.source.startsWith('Wikidata') ? 'established' : symbol.status,
    })
  }
  addLegacy(legacyBirds.has(iso) ? 'bird' : 'animal', entry?.national_animal)
  addLegacy('flower', entry?.national_flower)
  for (const kind of kinds) {
    if (extra.symbols[iso]?.[kind]) catalog[kind] = extra.symbols[iso][kind]
    counts[kind] += catalog[kind].length
    const primary = catalog[kind][0]
    if (primary) country.attributes[`national_${kind}`] = primary
    else delete country.attributes[`national_${kind}`]
  }
  country.attributes.national_symbols = catalog
  country.attributes.national_symbols_checked_at = extra.checked_at
  country.attributes.national_anthems = anthems.countries[iso] ?? []
  if (officialNames[iso]) country.attributes.official_name = officialNames[iso]
  const facts = extra.country_facts?.[iso]
  for (const language of facts?.additional_languages ?? []) {
    country.attributes.languages ??= []
    country.attributes.languages_detail ??= []
    if (!country.attributes.languages.includes(language.de)) country.attributes.languages.push(language.de)
    if (!country.attributes.languages_detail.some((item) => item.code === language.code))
      country.attributes.languages_detail.push(language)
    country.provenance.fields = {
      ...country.provenance.fields,
      languages: { source: facts.source, source_url: facts.source_url, imported_at: extra.checked_at },
    }
  }
}
writeJson(path, countries)
console.log(
  `Nationale Symbole: ${JSON.stringify(counts)} · ${countries.length} strukturierte Symbolkataloge · ${countries.filter((country) => country.attributes.national_anthems.length).length} Hymnenprofile`,
)
