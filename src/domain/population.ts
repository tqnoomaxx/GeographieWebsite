import type { Entity } from './types'

export function populationReference(country: Entity) {
  const field = country.provenance.fields?.population
  if (!field?.reference_date) return undefined
  const date = field.reference_date
  const label = `${field.method === 'projection' ? 'UN-Projektion' : 'UN-Schätzung'} ${date.slice(0, 4)}`
  return {
    label,
    detail: `${field.method === 'projection' ? 'Mittlere UN-Projektion' : 'UN-Schätzung'} zum ${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}.`,
    date,
    source: field.source,
    url: field.source_url,
  }
}

export function formatPop(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2).replace('.', ',')} Mrd.`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace('.', ',')} Mio.`
  return n.toLocaleString('de-DE')
}

/** Shared by new questions and the repair of unanswered saved questions. */
export function populationComparisonDetails(a: Entity, b: Entity) {
  const references = [a, b].map(populationReference).filter((value) => value !== undefined)
  return {
    explanation: `${a.names.de}: ${formatPop(a.attributes.population!)} Einwohner · ${b.names.de}: ${formatPop(b.attributes.population!)} Einwohner`,
    facts: [...new Set(references.map((reference) => reference.detail))],
    sources: [
      ...new Map(
        references.flatMap((reference) =>
          reference.url ? [[reference.url, { label: reference.source, url: reference.url }] as const] : [],
        ),
      ).values(),
    ],
  }
}
