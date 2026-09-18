import { Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOnline } from './hooks'
import { Skeleton } from '@/ui'

const NAV = [
  { to: '/', key: 'nav.home', icon: '🌍', end: true },
  { to: '/play', key: 'nav.play', icon: '🎯' },
  { to: '/learn', key: 'nav.learn', icon: '📚' },
  { to: '/explore', key: 'nav.explore', icon: '🧭' },
  { to: '/progress', key: 'nav.progress', icon: '🏆' },
]

export function Layout() {
  const { t } = useTranslation()
  const online = useOnline()
  const { pathname } = useLocation()
  const immersive = /^\/play\/[^/]+\/round/.test(pathname) || /^\/daily\/[^/]+$/.test(pathname)
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 hidden border-b border-line bg-bg/90 backdrop-blur md:block">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <span aria-hidden>🧭</span> {t('app.name')}
          </NavLink>
          <nav className="flex gap-1" aria-label="Hauptnavigation">
            {NAV.slice(1).map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-accent-soft text-accent' : 'hover:bg-card-2'}`}>
                {t(n.key)}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <NavLink to="/search" className="btn-ghost px-3" aria-label={t('nav.search')}>
              🔎
            </NavLink>
            <NavLink to="/profile" className="btn-ghost px-3" aria-label={t('nav.profile')}>
              👤
            </NavLink>
          </div>
        </div>
      </header>
      {!online && (
        <div role="status" className="bg-warn-soft px-4 py-1.5 text-center text-xs text-ink">
          {t('common.offline')}
        </div>
      )}
      <main className="flex-1">
        <Suspense fallback={<div className="mx-auto max-w-5xl p-4"><Skeleton className="h-40" /></div>}>
          <Outlet />
        </Suspense>
      </main>
      {!immersive && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Hauptnavigation">
          <div className="grid grid-cols-5">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-accent' : 'text-ink-2'}`}
              >
                <span className="text-xl" aria-hidden>
                  {n.icon}
                </span>
                {t(n.key)}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
