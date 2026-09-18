import { useTranslation } from 'react-i18next'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { loadAttribution } from '@/services/data/dataService'
import { Page, Card, Skeleton } from '@/ui'

/** Minimaler Markdown-Renderer für die generierte Attribution (Überschriften, Listen, Tabellen, Links). */
function render(md: string) {
  const lines = md.split('\n')
  const out: React.ReactNode[] = []
  let table: string[][] = []
  const flushTable = () => {
    if (!table.length) return
    const [head, ...rows] = table
    out.push(
      <table key={out.length} className="my-2 w-full text-sm">
        <thead><tr>{head.map((h, i) => <th key={i} className="border-b border-line py-1 text-left">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="py-1 pr-2">{inline(c)}</td>)}</tr>)}</tbody>
      </table>,
    )
    table = []
  }
  for (const line of lines) {
    if (line.startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim())
      if (!cells.every((c) => /^-+$/.test(c))) table.push(cells)
      continue
    }
    flushTable()
    if (line.startsWith('# ')) continue
    else if (line.startsWith('## ')) out.push(<h2 key={out.length} className="mt-4 font-semibold">{line.slice(3)}</h2>)
    else if (line.startsWith('- ')) out.push(<li key={out.length} className="ml-4 list-disc text-sm">{inline(line.slice(2))}</li>)
    else if (line.trim()) out.push(<p key={out.length} className="text-sm text-ink-2">{inline(line)}</p>)
  }
  flushTable()
  return out
}
function inline(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) return <a key={i} className="underline" href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>
    if (p.startsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.startsWith('`')) return <code key={i} className="rounded bg-card-2 px-1">{p.slice(1, -1)}</code>
    return p
  })
}

export default function SourcesPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('settings.sources'))
  const { data } = useAsync(() => loadAttribution(), [])
  return (
    <Page title={t('settings.sources')} back="/settings">
      <Card>{data ? render(data.markdown) : <Skeleton className="h-40" />}</Card>
    </Page>
  )
}
