import { defineConfig, devices } from '@playwright/test'

const base = process.env.VITE_BASE_URL ?? '/'
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['line'], ['github'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL: `http://localhost:4187${base}`,
    locale: 'de-DE',
    // Ein Service Worker kann page.route umgehen und simulierte Ausfälle verdecken.
    // Der eigene Offline-Cache-Test aktiviert ihn ausdrücklich.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `${process.env.PLAYWRIGHT_SKIP_BUILD === '1' ? '' : 'npx vite build && '}npx vite preview --port 4187 --strictPort`,
    port: 4187,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
})
