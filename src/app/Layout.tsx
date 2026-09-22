import { Suspense, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOnline } from './hooks'
import { Skeleton } from '@/ui'
import { Icons } from '@/ui/icons'
import { BrandMark } from '@/ui/BrandMark'
import { useAuth } from './AuthProvider'

const NAV = [
  { to: '/', key: 'nav.home', icon: Icons.home, end: true },
  { to: '/play', key: 'nav.play', icon: Icons.play },
  { to: '/learn', key: 'nav.learn', icon: Icons.learn },
  { to: '/explore', key: 'nav.explore', icon: Icons.explore },
  { to: '/progress', key: 'nav.progress', icon: Icons.progress },
]

export function Layout() {
  const { t } = useTranslation()
  const online = useOnline()
  const { pathname } = useLocation()
  const { mfaRequired } = useAuth()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const immersive = /^\/play\/[^/]+\/round/.test(pathname) || pathname.startsWith('/play/session/') || /^\/daily\/[^/]+$/.test(pathname)
  return (
    <div className={`flex min-h-dvh flex-col ${immersive ? '' : 'site-shell'}`}>
      {!immersive && <header className="sticky top-0 z-40 hidden border-b border-line bg-bg/85 backdrop-blur md:block">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <BrandMark className="h-8 w-8" />
            {t('app.name')}
          </NavLink>
          <nav className="flex gap-1" aria-label="Hauptnavigation">
            {NAV.slice(1).map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-card-2 hover:text-ink'}`}>
                <n.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {t(n.key)}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <NavLink to="/daily" className="btn-ghost px-3 py-2" aria-label={t('nav.daily')}><Icons.daily className="h-5 w-5" strokeWidth={1.75} /></NavLink>
            <NavLink to="/search" className="btn-ghost px-3 py-2" aria-label={t('nav.search')}><Icons.search className="h-5 w-5" strokeWidth={1.75} /></NavLink>
            <NavLink to="/profile" className="btn-ghost px-3 py-2" aria-label={t('nav.profile')}><Icons.profile className="h-5 w-5" strokeWidth={1.75} /></NavLink>
          </div>
        </div>
      </header>}
      {!online && <div role="status" className="bg-warn-soft px-4 py-1.5 text-center text-xs text-ink">{t('common.offline')}</div>}
      {mfaRequired && pathname !== '/mfa' && <NavLink to="/mfa" role="alert" className="bg-warn-soft px-4 py-2 text-center text-sm font-medium text-ink underline">{t('account.mfa_required_banner')}</NavLink>}
      <main className="flex-1">
        <Suspense fallback={<div className="mx-auto max-w-5xl p-4"><Skeleton className="h-40" /></div>}>
          <Outlet />
        </Suspense>
      </main>
      {!immersive && (
        <footer className="border-t border-line px-4 pb-24 pt-6 text-sm text-ink-2 md:pb-6">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <NavLink to="/impressum" className="hover:text-ink">{t('legal.imprint')}</NavLink>
            <NavLink to="/datenschutz" className="hover:text-ink">{t('legal.privacy')}</NavLink>
            <NavLink to="/quellen" className="hover:text-ink">{t('settings.sources')}</NavLink>
            <span>© {new Date().getFullYear()} {t('app.name')}</span>
          </div>
        </footer>
      )}
      {!immersive && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Hauptnavigation">
          <div className="grid grid-cols-5">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-accent' : 'text-ink-2'}`}>
                {({ isActive }) => (
                  <>
                    <n.icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                    {t(n.key)}
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
