/** Stellt neue und ältere GitHub-Pages-Weiterleitungen einschließlich Suchparametern wieder her. */
export function pagesRedirect(search: string, base: string, hash = ''): string | null {
  const params = new URLSearchParams(search)
  const redirected = params.get('p')
  if (!redirected) return null
  params.delete('p')
  // Der alte 404-Fallback lagerte die ursprünglichen Suchparameter neben p aus.
  const path = redirected.includes('?') ? redirected : redirected.replace(/~and~/g, '&')
  const query = params.toString()
  const localPath = '/' + path.replace(/^\/+/, '')
  return (
    base.replace(/\/$/, '') + localPath + (query ? `${path.includes('?') ? '&' : '?'}${query}` : '') + hash
  )
}
