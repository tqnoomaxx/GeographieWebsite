import type { Country, NationalSymbol, NationalSymbolKind } from './types'

export function nationalSymbols(country: Country, kind: NationalSymbolKind): NationalSymbol[] {
  if (country.attributes.national_symbols) return country.attributes.national_symbols[kind] ?? []
  const legacy = country.attributes[`national_${kind}`] as NationalSymbol | undefined
  return legacy ? [legacy] : []
}
