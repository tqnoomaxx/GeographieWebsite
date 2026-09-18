import type { DataIndex, Entity } from '@/domain/types'
import type { CategoryId } from '@/engine/types'

/** Benannte Sammlungen wie in der Vorgängerversion: kuratierte Titel, Beschreibung, Gruppe, Umfang. */
export interface CollectionDef {
  id: string
  title: string
  shortTitle?: string
  description: string
  group: string
  scope: string // world | <continent> | country:<ISO>
  kinds: Array<'country' | 'region'>
  featured?: boolean
  /** erzwungene Spielart */
  mode?: string
  countryIso?: string
}

const REGIONAL_TITLES: Record<string, { title: string; short: string; description: string }> = {
  DE: { title: 'Deutsche Bundesländer', short: 'Deutschland', description: 'Alle 16 Bundesländer.' },
  AT: { title: 'Österreichische Bundesländer', short: 'Österreich', description: 'Alle neun Bundesländer.' },
  NL: { title: 'Niederländische Provinzen', short: 'Niederlande', description: 'Alle zwölf Provinzen.' },
  CH: { title: 'Schweizer Kantone', short: 'Schweiz', description: 'Alle 26 Kantone.' },
  ES: { title: 'Spanische Regionen', short: 'Spanien', description: 'Autonome Gemeinschaften sowie Ceuta und Melilla.' },
  IT: { title: 'Italienische Regionen', short: 'Italien', description: 'Alle 20 Regionen.' },
  PL: { title: 'Polnische Woiwodschaften', short: 'Polen', description: 'Alle 16 Woiwodschaften.' },
  BE: { title: 'Belgische Regionen & Provinzen', short: 'Belgien', description: 'Drei Regionen und alle zehn Provinzen.' },
  CZ: { title: 'Tschechische Regionen', short: 'Tschechien', description: 'Alle 13 Regionen plus Prag.' },
  HR: { title: 'Kroatische Gespanschaften', short: 'Kroatien', description: 'Alle 20 Gespanschaften plus Zagreb.' },
  SK: { title: 'Slowakische Regionen', short: 'Slowakei', description: 'Alle acht Verwaltungsregionen.' },
  SE: { title: 'Schwedische Län', short: 'Schweden', description: 'Alle 21 Verwaltungsbezirke als Wappenbanner.' },
  GB: { title: 'Landesteile des UK', short: 'Vereinigtes Königreich', description: 'England, Schottland, Wales und Nordirland.' },
  US: { title: 'US-Bundesstaaten', short: 'USA', description: 'Alle 50 Bundesstaaten plus Washington, D.C.' },
  CA: { title: 'Kanadische Provinzen', short: 'Kanada', description: 'Alle Provinzen und Territorien.' },
  MX: { title: 'Mexikanische Bundesstaaten', short: 'Mexiko', description: 'Alle 32 Gliedstaaten.' },
  BR: { title: 'Brasilianische Bundesstaaten', short: 'Brasilien', description: 'Alle 26 Bundesstaaten plus Bundesdistrikt.' },
  AR: { title: 'Argentinische Provinzen', short: 'Argentinien', description: 'Alle 23 Provinzen plus Buenos Aires.' },
  CO: { title: 'Kolumbianische Departamentos', short: 'Kolumbien', description: 'Alle 32 Departamentos plus Bogotá.' },
  CL: { title: 'Chilenische Regionen', short: 'Chile', description: 'Alle 16 Regionen des Landes.' },
  MY: { title: 'Malaysische Gliedstaaten', short: 'Malaysia', description: '13 Gliedstaaten und drei Bundesterritorien.' },
  ID: { title: 'Indonesische Provinzen', short: 'Indonesien', description: '34 Provinzen.' },
  EC: { title: 'Provinzen Ecuadors', short: 'Ecuador', description: 'Alle 24 Provinzen Ecuadors.' },
  BO: { title: 'Departamentos Boliviens', short: 'Bolivien', description: 'Alle neun Departamentos Boliviens.' },
  CR: { title: 'Provinzen Costa Ricas', short: 'Costa Rica', description: 'Alle sieben Provinzen Costa Ricas.' },
  AU: { title: 'Australische Staaten', short: 'Australien', description: 'Bundesstaaten und große Territorien.' },
  JP: { title: 'Japanische Präfekturen', short: 'Japan', description: 'Alle 47 Präfekturen.' },
}

const CONTINENT_LABEL: Record<string, string> = { europe: 'Europa', asia: 'Asien', africa: 'Afrika', 'north-america': 'Nordamerika & Karibik', 'south-america': 'Südamerika', oceania: 'Ozeanien' }
const REGIONAL_GROUP: Record<string, string> = { europe: 'Europa regional', 'north-america': 'Amerika regional', 'south-america': 'Amerika regional', asia: 'Asien regional', oceania: 'Pazifik regional', africa: 'Afrika regional' }

/** Kategorien, die mit Sammlungen arbeiten; alle anderen nutzen den einfachen Bereichsfilter. */
export const COLLECTION_CATEGORIES: CategoryId[] = ['flags', 'regions', 'maps']

export function buildCollections(index: DataIndex, byId: Map<string, Entity>, category: CategoryId): CollectionDef[] {
  const flagsOnly = category === 'flags'
  const out: CollectionDef[] = []
  if (category !== 'regions') {
    out.push({ id: 'all', title: flagsOnly ? 'Alle Flaggen' : 'Alles', shortTitle: 'Alle', group: 'Komplett', description: 'Die komplette Sammlung aus Ländern, Gebieten und Regionen.', scope: 'world', kinds: ['country', 'region'], featured: true })
    out.push({ id: 'random', title: 'Überraschungsmix', shortTitle: 'Zufall', group: 'Komplett', description: 'Ein bunter Zufallsmix aus der gesamten Sammlung.', scope: 'world', kinds: ['country', 'region'], featured: true })
  }
  if (flagsOnly) out.push({ id: 'europe-map', title: 'Europa-Karte', shortTitle: 'Europa Hyper', group: 'Komplett', description: 'Hunderte Regionen auf einer Europakarte finden – Flagge zeigen, Gebiet antippen.', scope: 'europe', kinds: ['region'], featured: true, mode: 'europe_map' })
  if (category !== 'regions') {
    out.push({ id: 'countries', title: 'Länder & Gebiete', shortTitle: 'Weltweit', group: 'Welt', description: 'Alle Staaten und Territorien der Welt.', scope: 'world', kinds: ['country'] })
    for (const [c, label] of Object.entries(CONTINENT_LABEL)) out.push({ id: c, title: label, group: 'Welt', description: `Länder und Gebiete: ${label}.`, scope: c, kinds: ['country'] })
  }
  for (const [countryId, entry] of Object.entries(index.regions)) {
    const country = byId.get(countryId)
    if (!country) continue
    const iso = country.attributes.iso2 as string
    const known = REGIONAL_TITLES[iso]
    const continent = (country.attributes.continent as string) ?? 'europe'
    out.push({
      id: `regions-${iso}`,
      title: known?.title ?? `${country.names.de}: Regionen`,
      shortTitle: known?.short ?? country.names.de,
      group: REGIONAL_GROUP[continent] ?? 'Regional',
      description: known?.description ?? `${entry.count} Gebiete mit eigener Flagge.`,
      scope: countryId,
      kinds: ['region'],
      countryIso: iso,
    })
  }
  return out
}

export const GROUP_ORDER = ['Komplett', 'Welt', 'Europa regional', 'Amerika regional', 'Asien regional', 'Pazifik regional', 'Afrika regional', 'Regional']
