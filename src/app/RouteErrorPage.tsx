import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

export function RouteErrorPage() {
  const error = useRouteError()
  const missing = isRouteErrorResponse(error) && error.status === 404
  return <PageLoadFailure missing={missing} />
}

export function PageLoadFailure({ missing = false }: { missing?: boolean }) {
  return (
    <main className="mx-auto max-w-lg p-6" role="alert">
      <h1 className="mb-3 text-xl font-semibold">
        {missing ? 'Seite nicht gefunden' : 'Diese Seite konnte nicht geladen werden'}
      </h1>
      <p className="mb-4 text-sm text-ink-2">
        {missing
          ? 'Die Adresse ist möglicherweise nicht mehr aktuell.'
          : 'Bitte prüfe deine Verbindung. Bei einem Update hilft es, die aktuelle Version neu zu laden.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" onClick={() => location.reload()}>
          Erneut versuchen
        </button>
        <Link className="btn-secondary" to="/">
          Zur Startseite
        </Link>
      </div>
    </main>
  )
}
