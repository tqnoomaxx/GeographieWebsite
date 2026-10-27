import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { useGeoData } from '@/app/DataProvider'
import { loadSearch } from '@/services/data/dataService'
import { normalizeAnswer } from '@/engine/normalize'
import { Page, entityPath, ErrorState, LoadingState } from '@/ui'
import { TypeIcon } from '@/ui/icons'
import { EXERCISES, exercisePath, topicFor } from '@/config/quizCatalog'

export default function SearchPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.search'))
  const geo = useGeoData()
  const { data: index, loading, error, reload } = useAsync(() => loadSearch(), [])
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const requestedType = params.get('type') ?? 'all'
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value && !(key === 'type' && value === 'all')) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const searchable = useMemo(
    () => [
      ...(index ?? []).map((item) => ({ ...item, href: entityPath({ id: item.id, type: item.t as never }) })),
      ...EXERCISES.map((quiz) => ({
        id: 'quiz:' + quiz.id,
        t: 'quiz',
        n: quiz.title,
        a: [topicFor(quiz.topic)?.title ?? '', quiz.description],
        c: undefined,
        href: exercisePath(quiz),
      })),
    ],
    [index],
  )
  const typeLabel = (value: string) => (value === 'quiz' ? 'Quiz' : t(`type.${value}`))
  const types = [...new Set(searchable.map((item) => item.t))].sort()
  const type = types.includes(requestedType) ? requestedType : 'all'

  const results = useMemo(() => {
    const n = normalizeAnswer(q)
    if (n.length < 2) return []
    const scored = searchable
      .map((e) => {
        const name = normalizeAnswer(e.n)
        const score =
          name === n
            ? 3
            : name.startsWith(n)
              ? 2
              : name.includes(n) || e.a.some((a) => normalizeAnswer(a).includes(n))
                ? 1
                : 0
        return { e, score }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.e.n.localeCompare(b.e.n))
    return scored.map((x) => x.e)
  }, [q, searchable])
  const filtered = results.filter((item) => type === 'all' || item.t === type)
  return (
    <Page title={t('nav.search')}>
      <input
        autoFocus
        value={q}
        onChange={(e) => update('q', e.target.value)}
        placeholder={t('search.placeholder')}
        className="mb-4 min-h-12 w-full rounded-xl border border-line bg-card px-4"
        aria-label={t('nav.search')}
      />
      <label className="search-type-filter">
        Typ
        <select value={type} onChange={(e) => update('type', e.target.value)}>
          <option value="all">Alle Typen ({results.length})</option>
          {types.map((value) => (
            <option key={value} value={value}>
              {typeLabel(value)} ({results.filter((item) => item.t === value).length})
            </option>
          ))}
        </select>
      </label>
      {!loading && !error && normalizeAnswer(q).length >= 2 && (
        <p className="mb-3 text-sm text-ink-2" role="status">
          {filtered.length} Treffer
          {filtered.length > 40 ? ' · Erste 40 angezeigt. Suche oder Typ eingrenzen.' : ''}
        </p>
      )}
      {error ? (
        <ErrorState onRetry={reload} />
      ) : loading ? (
        <LoadingState message="Suchindex wird geladen …" />
      ) : normalizeAnswer(q).length < 2 ? (
        <p className="text-sm text-ink-2">{t('search.hint')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-ink-2">{t('search.no_results')}</p>
      ) : (
        <ul className="card divide-y divide-line">
          {filtered.slice(0, 40).map((r) => {
            const country = r.c ? geo.byId.get(r.c) : undefined
            return (
              <li key={r.id}>
                <Link to={r.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-card-2">
                  <TypeIcon type={r.t} className="h-4 w-4 text-ink-2" />
                  <span className="flex-1">
                    <span className="font-medium">{r.n}</span>{' '}
                    <span className="ml-2 text-xs text-ink-2">
                      {typeLabel(r.t)}
                      {country ? ` · ${country.names.de}` : ''}
                    </span>
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
