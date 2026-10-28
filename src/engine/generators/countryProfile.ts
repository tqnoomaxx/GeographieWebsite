import type { Country } from '@/domain/types'
import { capitalAnswers, countryCapitals } from '@/domain/capitals'
import { nationalSymbols } from '@/domain/nationalSymbols'
import type { Generator } from './base'
import { isSovereign, qid } from './base'
import type { GeneratorContext, ProfileField } from '../types'
const continents: Record<string, string> = {
  europe: 'Europa',
  asia: 'Asien',
  africa: 'Afrika',
  'north-america': 'Nordamerika',
  'south-america': 'Südamerika',
  oceania: 'Ozeanien',
  antarctica: 'Antarktis',
}
const subregions: Record<string, string> = {
  'Southern Europe': 'Südeuropa',
  'Northern Europe': 'Nordeuropa',
  'Western Europe': 'Westeuropa',
  'Central Europe': 'Mitteleuropa',
  'Eastern Europe': 'Osteuropa',
  'Southeast Europe': 'Südosteuropa',
  'Western Asia': 'Westasien',
  'Southern Asia': 'Südasien',
  'Eastern Asia': 'Ostasien',
  'South-Eastern Asia': 'Südostasien',
  'Central Asia': 'Zentralasien',
  'Middle Africa': 'Zentralafrika',
  'Northern Africa': 'Nordafrika',
  'Southern Africa': 'Südliches Afrika',
  'Eastern Africa': 'Ostafrika',
  'Western Africa': 'Westafrika',
  'North America': 'Nordamerika',
  'Central America': 'Zentralamerika',
  'South America': 'Südamerika',
  Caribbean: 'Karibik',
  Polynesia: 'Polynesien',
  Melanesia: 'Melanesien',
  Micronesia: 'Mikronesien',
  'Australia and New Zealand': 'Australien und Neuseeland',
}
const unique = (values: Array<string | undefined>) => [
  ...new Set(values.filter((value): value is string => !!value?.trim())),
]
export function countryProfileFields(country: Country, ctx: GeneratorContext): ProfileField[] {
  const a = country.attributes
  const capitals = capitalAnswers(country, ctx.byId)
  const seat = a.capital_details?.find((c) => c.role === 'government_seat')
  const seatEntity = seat ? ctx.byId.get(seat.city) : undefined
  const isSeat = !capitals.length && !!seatEntity
  const capitalValues = isSeat
    ? [seatEntity!.names.de, seatEntity!.names.en, ...(seatEntity!.aliases ?? [])].filter(
        (s): s is string => !!s,
      )
    : capitals
  const languageDetails = (a.languages_detail ?? []) as Array<{ de: string; en?: string }>
  const languages = [
    ...(a.languages ?? []),
    ...languageDetails.flatMap((l) => [l.de, l.en]).filter((s): s is string => !!s),
  ]
  if (a.iso2 === 'CH') languages.push('Deutsch', 'Schweizerdeutsch')
  const languageNames = unique(
    (a.languages ?? []).map((name) =>
      a.iso2 === 'CH' && name === 'Alemannisch' ? 'Deutsch (Schweizerdeutsch)' : name,
    ),
  )
  const allCurrencies = a.currencies ?? []
  const domestic = allCurrencies.find((c) => c.code === a.domestic_currency)
  const currencies = domestic ? [domestic] : allCurrencies
  const currencyAnswers = currencies
    .flatMap((c) => [c.name, c.code, (c as { name_en?: string }).name_en])
    .filter((s): s is string => !!s)
  if (currencies.some((c) => c.code === 'USD'))
    currencyAnswers.push('US-Dollar', 'US Dollar', 'amerikanischer Dollar')
  const region = continents[a.statistical_region ?? a.continent ?? '']
  const highest = a.highest_point
  const mountain = highest?.wikidata ? ctx.byId.get(`mountain:${highest.wikidata}`) : undefined
  const neighbors = (a.borders ?? [])
    .map((id) => ctx.byId.get(id))
    .filter((entity): entity is Country => entity?.type === 'country')
  const subregion = a.subregion ? subregions[a.subregion] : undefined
  return [
    {
      id: 'capital',
      label: isSeat ? 'Regierungssitz' : a.iso2 === 'CH' ? 'Bundesstadt' : 'Hauptstadt',
      answers: capitalValues,
      display: isSeat
        ? seatEntity!.names.de
        : countryCapitals(country, ctx.byId)
            .map((c) => c.names.de)
            .join(' / '),
    },
    {
      id: 'continent',
      label: 'Kontinent (UN-Zuordnung)',
      answers: region ? [region] : [],
      display: region ?? '',
    },
    {
      id: 'currency',
      label: domestic ? 'Eigene Landeswährung' : 'Währung',
      answers: currencyAnswers,
      display: currencies.map((c) => `${c.name} (${c.code})`).join(' / '),
    },
    {
      id: 'language',
      label: 'Sprachen (eine genügt)',
      answers: unique(languages),
      display: languageNames.join(' / '),
    },
    {
      id: 'iso2',
      label: 'ISO-Länderkürzel (2 Buchstaben)',
      answers: [a.iso2],
      display: a.iso2,
      normalization: 'code',
    },
    {
      id: 'calling_code',
      label: 'Telefonvorwahl',
      answers: a.calling_code ? [a.calling_code, a.calling_code.replace(/^\+/, '00')] : [],
      display: a.calling_code ?? '',
      normalization: 'code',
    },
    {
      id: 'tld',
      label: 'Internet-Endung',
      answers: a.tld ?? [],
      display: (a.tld ?? []).join(' / '),
      normalization: 'domain',
    },
    {
      id: 'highest_point',
      label: 'Höchste Erhebung (inkl. Außengebiete)',
      answers: highest
        ? unique([highest.name, mountain?.names.de, mountain?.names.en, ...(mountain?.aliases ?? [])])
        : [],
      display: highest
        ? highest.name +
          (typeof highest.elevation_m === 'number'
            ? ` · ${Math.round(highest.elevation_m).toLocaleString('de-DE')} m`
            : '')
        : '',
    },
    {
      id: 'neighbors',
      label: 'Nachbarländer (eines genügt)',
      answers: neighbors.length
        ? unique(
            neighbors
              .flatMap((neighbor) => [neighbor.names.de, neighbor.names.en, ...(neighbor.aliases ?? [])])
              .filter((name) => name && name.length > 2),
          )
        : ['keine', 'keine Nachbarländer', 'keine Landnachbarn', 'keine Landgrenzen'],
      display: neighbors.length
        ? neighbors.map((neighbor) => neighbor.names.de).join(' / ')
        : 'Keine Landnachbarn',
    },
    {
      id: 'iso3',
      label: 'ISO-Länderkürzel (3 Buchstaben)',
      answers: a.iso3 ? [a.iso3] : [],
      display: a.iso3 ?? '',
      normalization: 'code',
    },
    {
      id: 'subregion',
      label: 'Weltregion',
      answers: subregion ? [subregion, a.subregion!] : [],
      display: subregion ?? '',
    },
    ...(['animal', 'bird', 'flower', 'tree'] as const).map((kind): ProfileField => {
      const symbols = nationalSymbols(country, kind)
      return {
        id: `national_${kind}`,
        label: {
          animal: 'Nationaltier / Wappentier',
          bird: 'Nationalvogel',
          flower: 'Nationalblume',
          tree: 'Nationalbaum',
        }[kind],
        answers: unique(
          symbols.flatMap((symbol) => [
            symbol.name,
            symbol.scientific_name,
            symbol.name.replace(/\s*\([^)]*\)/g, '').trim(),
            ...(symbol.name.match(/\(([^)]+)\)/)?.slice(1) ?? []),
          ]),
        ),
        display: symbols.map((symbol) => symbol.name).join(' / '),
      }
    }),
  ]
}
export const countryProfile: Generator = {
  id: 'country_profile',
  category: 'countries',
  pool: (ctx) => ctx.countries.filter(isSovereign),
  make(target, ctx, _rng, difficulty) {
    const fields = countryProfileFields(target as Country, ctx).filter(
      (field) => field.answers.length && field.display,
    )
    if (!fields.length) return null
    return {
      id: qid(this.id, target),
      category: 'countries',
      type: this.id,
      question_type: 'profile_input',
      prompt: { key: 'q.country_profile', params: { name: target.names.de } },
      answer: target.id,
      profileFields: fields,
      difficulty,
      entities: [target.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}
