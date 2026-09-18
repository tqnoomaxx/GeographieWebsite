import { defineConfig, devices } from '@playwright/test'

const base = process.env.VITE_BASE_URL ?? '/'
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:4187${base}`, locale: 'de-DE', trace: 'retain-on-failure' },
  webServer: { command: 'npx vite preview --port 4187 --strictPort', port: 4187, reuseExistingServer: false },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
})
