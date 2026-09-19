import type { DataIndex, Entity } from '@/domain/types'
import type { Content } from './quizzes'

/** Flaggen-Sammlungen für den Lernkarten-Explorer (kuratierte Titel je Land). */
export interface CollectionDef {
  id: string
  title: string
  description: string
  scope: string // world | <continent> | country:<ISO>
  content: Content[]
}

const REGIONAL_TITLES: Record<string, { title: string; description: string }> = {
  DE: { title: 'Deutsche Bundesländer', description: 'Alle 16 Bundesländer.' },
  AT: { title: 'Österreichische Bundesländer', description: 'Alle neun Bundesländer.' },
  NL: { title: 'Niederländische Provinzen', description: 'Alle zwölf Provinzen.' },
  CH: { title: 'Schweizer Kantone', description: 'Alle 26 Kantone.' },
  ES: { title: 'Spanische Regionen', description: 'Autonome Gemeinschaften sowie Ceuta und Melilla.' },
  IT: { title: 'Italienische Regionen', description: 'Alle 20 Regionen.' },
  PL: { title: 'Polnische Woiwodschaften', description: 'Alle 16 Woiwodschaften.' },
  BE: { title: 'Belgische Regionen & Provinzen', description: 'Drei Regionen und alle zehn Provinzen.' },
  CZ: { title: 'Tschechische Regionen', description: 'Alle 13 Regionen plus Prag.' },
  HR: { title: 'Kroatische Gespanschaften', description: 'Alle 20 Gespanschaften plus Zagreb.' },
  SK: { title: 'Slowakische Regionen', description: 'Alle acht Verwaltungsregionen.' },
  SE: { title: 'Schwedische Län', description: 'Alle 21 Verwaltungsbezirke als Wappenbanner.' },
  GB: { title: 'Landesteile des UK', description: 'England, Schottland, Wales und Nordirland.' },
  US: { title: 'US-Bundesstaaten', description: 'Alle 50 Bundesstaaten plus Washington, D.C.' },
  CA: { title: 'Kanadische Provinzen', description: 'Alle Provinzen und Territorien.' },
  MX: { title: 'Mexikanische Bundesstaaten', description: 'Alle 32 Gliedstaaten.' },
  BR: { title: 'Brasilianische Bundesstaaten', description: 'Alle 26 Bundesstaaten plus Bundesdistrikt.' },
  AR: { title: 'Argentinische Provinzen', description: 'Alle 23 Provinzen plus Buenos Aires.' },
  CO: { title: 'Kolumbianische Departamentos', description: 'Alle 32 Departamentos plus Bogotá.' },
  CL: { title: 'Chilenische Regionen', description: 'Alle 16 Regionen des Landes.' },
  MY: { title: 'Malaysische Gliedstaaten', description: '13 Gliedstaaten und drei Bundesterritorien.' },
  ID: { title: 'Indonesische Provinzen', description: '34 Provinzen.' },
  EC: { title: 'Provinzen Ecuadors', description: 'Alle 24 Provinzen Ecuadors.' },
  BO: { title: 'Departamentos Boliviens', description: 'Alle neun Departamentos Boliviens.' },
  CR: { title: 'Provinzen Costa Ricas', description: 'Alle sieben Provinzen Costa Ricas.' },
  AU: { title: 'Australische Staaten', description: 'Bundesstaaten und große Territorien.' },
  JP: { title: 'Japanische Präfekturen', description: 'Alle 47 Präfekturen.' },
}

const CONTINENT_LABEL: Record<string, string> = { europe: 'Europa', asia: 'Asien', africa: 'Afrika', 'north-america': 'Nordamerika & Karibik', 'south-america': 'Südamerika', oceania: 'Ozeanien' }

export function buildCollections(index: DataIndex, byId: Map<string, Entity>): CollectionDef[] {
  const out: CollectionDef[] = [
    { id: 'all', title: 'Alle Flaggen', description: 'Die komplette Sammlung aus Ländern, Gebieten und Regionen.', scope: 'world', content: ['country', 'region'] },
    { id: 'countries', title: 'Länder & Gebiete', description: 'Alle Staaten und Territorien der Welt.', scope: 'world', content: ['country'] },
  ]
  for (const [c, label] of Object.entries(CONTINENT_LABEL)) out.push({ id: c, title: label, description: `Länder und Gebiete: ${label}.`, scope: c, content: ['country'] })
  for (const [countryId, entry] of Object.entries(index.regions)) {
    const country = byId.get(countryId)
    if (!country) continue
    const iso = country.attributes.iso2 as string
    const known = REGIONAL_TITLES[iso]
    out.push({ id: `regions-${iso}`, title: known?.title ?? `${country.names.de}: Regionen`, description: known?.description ?? `${entry.count} Gebiete mit eigener Flagge.`, scope: countryId, content: ['region'] })
  }
  return out
}

/** Sammlung, die zu einem Runden-Setup passt (Link „Lernkarten“ im Setup). */
export function collectionFor(scope: string, content: Content[] | undefined, byId: Map<string, Entity>): string {
  if (scope.startsWith('country:')) return `regions-${byId.get(scope)?.attributes.iso2 as string}`
  if (content?.length === 1 && content[0] === 'country') return scope === 'world' ? 'countries' : scope
  return 'all'
}
