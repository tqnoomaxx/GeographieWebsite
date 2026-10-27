import type { Country } from '@/domain/types'
import { capitalAnswers, countryCapitals } from '@/domain/capitals'
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
  const allCurrencies = a.currencies ?? []
  const domestic = allCurrencies.find((c) => c.code === a.domestic_currency)
  const currencies = domestic ? [domestic] : allCurrencies
  const currencyAnswers = currencies
    .flatMap((c) => [c.name, c.code, (c as { name_en?: string }).name_en])
    .filter((s): s is string => !!s)
  if (currencies.some((c) => c.code === 'USD'))
    currencyAnswers.push('US-Dollar', 'US Dollar', 'amerikanischer Dollar')
  const region = continents[a.statistical_region ?? a.continent ?? '']
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
      display: currencies.map((c) => c.name).join(' / '),
    },
    { id: 'language', label: 'Eine Sprache', answers: languages, display: (a.languages ?? []).join(' / ') },
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
  ]
}
export const countryProfile: Generator = {
  id: 'country_profile',
  category: 'countries',
  pool: (ctx) => ctx.countries.filter(isSovereign),
  make(target, ctx, _rng, difficulty) {
    const fields = countryProfileFields(target as Country, ctx)
    if (fields.some((f) => !f.answers.length)) return null
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
