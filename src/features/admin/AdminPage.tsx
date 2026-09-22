import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { useGeoData } from '@/app/DataProvider'
import { dataUrl } from '@/services/data/dataService'
import { Page, Card, Stat, Skeleton, entityPath } from '@/ui'

interface Quality {
  generated_at: string
  counts: Record<string, number>
  media: number
  relationships: number
  countries_without_population: string[]
  countries_without_capital: string[]
  countries_without_area: string[]
  countries_without_outline: string[]
  entities_without_media: string[]
  conflicts: Array<{ id: string; conflicts: Array<{ field: string; values: Array<{ source: string; value: unknown }> }> }>
  warnings: string[]
}

/**
 * Datenqualitäts-Dashboard (Phase F, Vorstufe). Zeigt den Report des Validators (public/data/quality.json)
 * Der geschützte Admin-Bereich mit Serverdaten folgt erst bei aktivierter Backend-Konfiguration.
 */
export default function AdminPage() {
  const { t } = useTranslation()
  useDocumentTitle('Admin · Datenqualität')
  const geo = useGeoData()
  const { data: q } = useAsync(() => fetch(dataUrl('quality.json')).then((r) => r.json() as Promise<Quality>), [])
  if (!q) return <Page title="Admin"><Skeleton className="h-40" /></Page>
  const total = Object.values(q.counts).reduce((a, b) => a + b, 0)
  const issues = q.countries_without_population.length + q.countries_without_capital.length + q.countries_without_area.length + q.countries_without_outline.length + q.conflicts.length
  const complete = Math.round(((total - issues) / total) * 1000) / 10
  const list = (title: string, ids: string[]) =>
    ids.length > 0 && (
      <Card className="mb-3">
        <h3 className="mb-1 font-medium">⚠ {ids.length} {title}</h3>
        <ul className="flex flex-wrap gap-1 text-sm">
          {ids.map((id) => {
            const e = geo.byId.get(id)
            return (
              <li key={id}>
                <Link to={e ? entityPath(e) : '#'} className="chip py-0.5">{e?.names.de ?? id}</Link>
              </li>
            )
          })}
        </ul>
      </Card>
    )
  return (
    <Page title="🛠 Admin · Datenqualität" back="/settings">
      <p className="mb-4 text-sm text-ink-2">Stand: {new Date(q.generated_at).toLocaleString('de-DE')} · lokaler Report aus <code>npm run data:validate</code>. Der geschützte Admin-Bereich mit Nutzer- und Vorschlagsverwaltung folgt mit dem Backend.</p>
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat value={`${complete} %`} label="vollständig" />
        <Stat value={total.toLocaleString('de-DE')} label="Entities" />
        <Stat value={q.media.toLocaleString('de-DE')} label="Medien mit Lizenz" />
        <Stat value={q.relationships.toLocaleString('de-DE')} label="Beziehungen" />
      </div>
      <Card className="mb-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
        {Object.entries(q.counts).map(([k, v]) => (
          <div key={k} className="flex justify-between rounded-lg bg-card-2 px-3 py-2"><span>{t(`type.${k}`)}</span><span className="tabular-nums">{v}</span></div>
        ))}
      </Card>
      {list('Länder ohne Einwohnerzahl', q.countries_without_population)}
      {list('Länder ohne Hauptstadt', q.countries_without_capital)}
      {list('Länder ohne Fläche', q.countries_without_area)}
      {list('Länder ohne Umriss', q.countries_without_outline)}
      {q.conflicts.length > 0 && (
        <Card className="mb-3">
          <h3 className="mb-1 font-medium">⚠ {q.conflicts.length} widersprüchliche Werte</h3>
          <ul className="grid gap-1 text-sm">
            {q.conflicts.map((c) => (
              <li key={c.id}>
                <Link className="underline" to={entityPath(geo.byId.get(c.id) ?? { id: c.id, type: 'country' })}>{geo.byId.get(c.id)?.names.de ?? c.id}</Link>: {c.conflicts.map((x) => `${x.field}: ${x.values.map((v) => String(v.value)).join(' / ')}`).join('; ')}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Page>
  )
}
