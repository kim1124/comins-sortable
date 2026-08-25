import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'test/playwright',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4175', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run example:serve',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', grepInvert: /@resource/, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', grepInvert: /@resource/, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', grepInvert: /@resource/, use: { ...devices['Desktop Safari'] } },
    { name: 'chromium-resource', grep: /@resource/, fullyParallel: false, workers: 1, use: { ...devices['Desktop Chrome'] } },
  ],
});
