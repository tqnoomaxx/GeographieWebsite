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
    <div className={`cosmic-shell flex min-h-dvh flex-col ${immersive ? 'is-immersive' : 'site-shell'}`}>
      {!immersive && <header className="site-header sticky top-0 z-40 hidden md:block">
        <div className="site-header-inner mx-auto flex max-w-[90rem] items-stretch px-4">
          <NavLink to="/" className="site-brand flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <span>{t('app.name')}</span>
            <small>52.5200° N<br />13.4050° E</small>
          </NavLink>
          <nav className="site-nav flex" aria-label="Hauptnavigation">
            {NAV.slice(1).map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `site-nav-link flex items-center gap-2 px-4 text-sm font-bold ${isActive ? 'is-active' : ''}`}>
                <n.icon className="h-4 w-4" strokeWidth={2} aria-hidden /> {t(n.key)}
              </NavLink>
            ))}
          </nav>
          <div className="site-tools ml-auto flex items-stretch">
            <NavLink to="/daily" className="site-tool" aria-label={t('nav.daily')}><Icons.daily className="h-5 w-5" strokeWidth={2} /></NavLink>
            <NavLink to="/search" className="site-tool" aria-label={t('nav.search')}><Icons.search className="h-5 w-5" strokeWidth={2} /></NavLink>
            <NavLink to="/profile" className="site-tool" aria-label={t('nav.profile')}><Icons.profile className="h-5 w-5" strokeWidth={2} /></NavLink>
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
        <footer className="site-footer px-4 pb-24 pt-10 text-sm md:pb-10">
          <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-6 gap-y-3">
            <BrandMark className="h-9 w-9" />
            <strong>{t('app.name')}</strong>
            <NavLink to="/impressum" className="hover:text-ink">{t('legal.imprint')}</NavLink>
            <NavLink to="/datenschutz" className="hover:text-ink">{t('legal.privacy')}</NavLink>
            <NavLink to="/quellen" className="hover:text-ink">{t('settings.sources')}</NavLink>
            <span className="ml-auto">© {new Date().getFullYear()} · Wissen macht Wege</span>
          </div>
        </footer>
      )}
      {!immersive && (
        <nav className="mobile-nav fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Hauptnavigation">
          <div className="grid grid-cols-5">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `mobile-nav-link flex min-h-16 flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide ${isActive ? 'is-active' : ''}`}>
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
