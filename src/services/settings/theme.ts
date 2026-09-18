export type ThemeMode = 'light' | 'dark' | 'system'
const KEY = 'gk.theme'

export function getThemeMode(): ThemeMode {
  return (localStorage.getItem(KEY) as ThemeMode | null) ?? 'system'
}

export function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f1526' : '#1e2a5a')
}

export function setThemeMode(mode: ThemeMode) {
  localStorage.setItem(KEY, mode)
  applyTheme(mode)
}

export function applyStoredTheme() {
  applyTheme(getThemeMode())
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemeMode() === 'system') applyTheme('system')
  })
}
