// Korrekturen überleben erneute Rohdaten- und Übersetzungsimporte.
const CHECKED_AT = '2026-10-15'
const ZIG_SOURCE =
  'https://www.rbz.co.zw/index.php/publications-notices/notices/press-release/1419-press-statement-introduction-of-zimbabwe-gold-zig-currency-code-zwg'
const STERLING_SOURCE = 'https://www.bankofengland.co.uk/banknotes/current-banknotes'

export function applyCountryQuizFacts(countries) {
  for (const country of countries) {
    // Die gebräuchliche Europa-Zuordnung Zyperns unterscheidet sich von UN-M49.
    if (country.attributes.iso2 === 'CY') {
      country.attributes.statistical_region = 'asia'
      country.provenance.fields ??= {}
      country.provenance.fields.statistical_region = {
        source: 'UN Statistics Division · M49',
        source_url: 'https://unstats.un.org/unsd/methodology/m49/overview/',
        imported_at: CHECKED_AT,
      }
    }
    const currencies = country.attributes.currencies ?? []
    for (const currency of currencies) {
      if (currency.code !== 'GBP') continue
      currency.name = 'Pfund Sterling'
      country.provenance.fields ??= {}
      country.provenance.fields['currencies.GBP.name'] = {
        source: 'Bank of England',
        source_url: STERLING_SOURCE,
        imported_at: CHECKED_AT,
      }
    }
    if (country.attributes.iso2 !== 'ZW') continue
    country.attributes.currencies = [
      { code: 'ZWG', name: 'Zimbabwe Gold (ZiG)', name_en: 'Zimbabwe Gold', symbol: 'ZiG' },
      ...currencies.filter((currency) => !['ZWB', 'ZWL', 'ZWG'].includes(currency.code)),
    ]
    country.provenance.fields ??= {}
    country.provenance.fields['currencies.ZWG'] = {
      source: 'Reserve Bank of Zimbabwe',
      source_url: ZIG_SOURCE,
      imported_at: CHECKED_AT,
    }
  }
}
