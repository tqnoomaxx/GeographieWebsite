const RELOAD_KEY = 'atlasfunke.route-recovery.v1'

/** Old lazy chunks disappear when GitHub Pages switches releases. Retry the document once. */
export function installRouteRecovery() {
  window.addEventListener('vite:preloadError', (event) => {
    if (!navigator.onLine) return
    try {
      const previous = Number(sessionStorage.getItem(RELOAD_KEY))
      if (previous && Date.now() - previous < 60_000) return
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    } catch {
      return
    }
    event.preventDefault()
    location.reload()
  })
}
