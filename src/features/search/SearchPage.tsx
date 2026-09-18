import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { useGeoData } from '@/app/DataProvider'
import { loadSearch } from '@/services/data/dataService'
import { normalizeAnswer } from '@/engine/normalize'
import { Page, entityPath } from '@/ui'
import { TypeIcon } from '@/ui/icons'

export default function SearchPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.search'))
  const geo = useGeoData()
  const { data: index } = useAsync(() => loadSearch(), [])
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    const n = normalizeAnswer(q)
    if (!index || n.length < 2) return []
    const scored = index
      .map((e) => {
        const name = normalizeAnswer(e.n)
        const score = name === n ? 3 : name.startsWith(n) ? 2 : name.includes(n) || e.a.some((a) => normalizeAnswer(a).includes(n)) ? 1 : 0
        return { e, score }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.e.n.localeCompare(b.e.n))
    return scored.slice(0, 40).map((x) => x.e)
  }, [q, index])
  return (
    <Page title={t('nav.search')}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('search.placeholder')}
        className="mb-4 min-h-12 w-full rounded-xl border border-line bg-card px-4"
        aria-label={t('nav.search')}
      />
      {q.length < 2 ? (
        <p className="text-sm text-ink-2">{t('search.hint')}</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-ink-2">{t('search.no_results')}</p>
      ) : (
        <ul className="card divide-y divide-line">
          {results.map((r) => {
            const country = r.c ? geo.byId.get(r.c) : undefined
            return (
              <li key={r.id}>
                <Link to={entityPath({ id: r.id, type: r.t as never })} className="flex items-center gap-3 px-4 py-2.5 hover:bg-card-2">
                  <TypeIcon type={r.t} className="h-4 w-4 text-ink-2" />
                  <span className="flex-1">
                    <span className="font-medium">{r.n}</span>
                    <span className="ml-2 text-xs text-ink-2">{t(`type.${r.t}`)}{country ? ` · ${country.names.de}` : ''}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}
