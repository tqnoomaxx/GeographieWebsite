export const PAGES_HISTORY_KEY = 'atlasfunke.pages.history.v1'

/** Restore only the state handed off by the 404 document for this exact navigation. */
export function pagesHistoryState(
  raw: string | null,
  destination: string,
  fallback: unknown,
  historyLength: number,
  now = Date.now(),
): unknown {
  if (!raw || raw.length > 2_000_000) return fallback
  try {
    const saved = JSON.parse(raw)
    const state = saved?.state
    if (
      saved?.path !== destination ||
      !Number.isFinite(saved.time) ||
      now - saved.time < 0 ||
      now - saved.time > 60_000 ||
      !state ||
      !Number.isSafeInteger(state.idx) ||
      state.idx < 0 ||
      state.idx >= historyLength ||
      (state.key !== undefined && (typeof state.key !== 'string' || state.key.length > 128))
    )
      return fallback
    let userState = state.usr ?? null
    if (
      saved.navigationType === 'navigate' &&
      userState &&
      typeof userState === 'object' &&
      !Array.isArray(userState)
    ) {
      userState = { ...userState }
      delete userState.atlasPageView
    }
    return {
      idx: state.idx,
      ...(state.key === undefined || saved.navigationType === 'navigate' ? {} : { key: state.key }),
      usr: userState,
    }
  } catch {
    return fallback
  }
}

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
