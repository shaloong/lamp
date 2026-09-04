import { defineConfig } from '@playwright/test'

const port = Number(process.env.LAMP_TEST_PORT || 1186)

export default defineConfig({
  testDir: './scripts/e2e',
  timeout: 30000,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(process.env.LAMP_TEST_BROWSER ? { channel: process.env.LAMP_TEST_BROWSER } : {}),
  },
  webServer: {
    command: `pnpm preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120000,
  },
})
