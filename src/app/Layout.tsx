import { Suspense, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOnline } from './hooks'
import { LoadingState, ErrorState } from '@/ui'
import { Icons, type NavAtlasIconId } from '@/ui/icons'
import { Globe, Map } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { useDataResources } from './DataProvider'
import { resourcesForPage } from './dataRequirements'

const NAV = [
  { to: '/', key: 'nav.home', icon: 'home', end: true },
  { to: '/play', key: 'nav.play', icon: 'play' },
  { to: '/story', key: 'Story', icon: 'daily' },
  { to: '/learn', key: 'nav.learn', icon: 'learn' },
  { to: '/explore', key: 'nav.explore', icon: 'explore' },
  { to: '/progress', key: 'nav.progress', icon: 'progress' },
] satisfies Array<{ to: string; key: string; icon: NavAtlasIconId; end?: boolean }>

export function Layout() {
  const { t } = useTranslation()
  const online = useOnline()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const data = useDataResources(resourcesForPage(pathname, new URLSearchParams(search)))
  const { mfaRequired } = useAuth()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const immersive =
    (pathname === '/story' && new URLSearchParams(search).has('level')) ||
    /^\/play\/[^/]+\/round/.test(pathname) ||
    pathname.startsWith('/play/session/') ||
    /^\/daily\/[^/]+$/.test(pathname)
  return (
    <div className={`simple-shell flex min-h-dvh flex-col ${immersive ? 'is-immersive' : 'site-shell'}`}>
      {!immersive && (
        <header className="simple-header">
          <div className="simple-header-inner">
            <NavLink to="/" className="simple-brand">
              <Globe aria-hidden strokeWidth={1.5} />
              <span>{t('app.name')}</span>
            </NavLink>
            <nav className="simple-desktop-nav" aria-label="Hauptnavigation">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) => (isActive ? 'is-active' : '')}
                >
                  {n.to === '/story' ? 'Story' : n.icon === 'play' ? 'Quiz' : t(n.key)}
                </NavLink>
              ))}
            </nav>
            <div className="simple-header-tools">
              <form
                className="simple-header-search"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault()
                  const q = String(new FormData(event.currentTarget).get('q') ?? '').trim()
                  navigate(`/search${q ? `?q=${encodeURIComponent(q)}` : ''}`)
                }}
              >
                <button type="submit" aria-label="Suchen">
                  <Icons.search aria-hidden />
                </button>
                <input
                  name="q"
                  placeholder="Themen, Länder oder Städte suchen …"
                  aria-label="Website durchsuchen"
                />
              </form>
              <NavLink
                to="/search"
                className="simple-icon-link mobile-search-link"
                aria-label={t('nav.search')}
              >
                <Icons.search aria-hidden />
              </NavLink>
              <NavLink to="/profile" className="simple-icon-link" aria-label={t('nav.profile')}>
                <Icons.profile aria-hidden />
              </NavLink>
            </div>
          </div>
        </header>
      )}
      {!online && (
        <div role="status" className="bg-warn-soft px-4 py-1.5 text-center text-xs text-ink">
          {t('common.offline')}
        </div>
      )}
      {mfaRequired && pathname !== '/mfa' && (
        <NavLink
          to="/mfa"
          role="alert"
          className="bg-warn-soft px-4 py-2 text-center text-sm font-medium text-ink underline"
        >
          {t('account.mfa_required_banner')}
        </NavLink>
      )}
      <main className="flex-1">
        <div className="route-content">
          {data.error ? (
            <ErrorState onRetry={data.retry} />
          ) : data.loading ? (
            <LoadingState />
          ) : (
            <Suspense fallback={<LoadingState />}>
              <Outlet />
            </Suspense>
          )}
        </div>
      </main>
      {!immersive && (
        <footer className="simple-footer">
          <NavLink to="/" className="simple-footer-brand">
            <Globe aria-hidden />
            {t('app.name')}
          </NavLink>
          <nav aria-label="Weitere Seiten">
            <NavLink to="/settings">Einstellungen</NavLink>
            <NavLink to="/kontakt">Kontakt</NavLink>
            <NavLink to="/quellen">Quellen</NavLink>
            <NavLink to="/datenschutz">Datenschutz</NavLink>
            <NavLink to="/impressum">Impressum</NavLink>
          </nav>
        </footer>
      )}
      {!immersive && (
        <nav
          className="mobile-nav fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden"
          aria-label="Hauptnavigation"
        >
          <div className="grid grid-cols-6">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `mobile-nav-link flex min-h-16 flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide ${isActive ? 'is-active' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    {(() => {
                      const Icon = n.to === '/story' ? Map : Icons[n.icon]
                      return (
                        <Icon
                          aria-hidden
                          className={`h-5 w-5 ${isActive ? 'is-active' : ''}`}
                          strokeWidth={1.7}
                        />
                      )
                    })()}
                    {n.to === '/story' ? 'Story' : n.icon === 'play' ? 'Quiz' : t(n.key)}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
