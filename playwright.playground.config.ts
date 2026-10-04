import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'test/playground',
  testMatch: ['playground.spec.ts', 'touch.spec.ts'],
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4003',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run playground:preview',
    url: 'http://127.0.0.1:4003/examples/simple/react',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium-touch', grep: /@touch/, use: { ...devices['Desktop Chrome'], hasTouch: true, isMobile: true } },
    { name: 'chromium', grepInvert: /@touch/, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', grepInvert: /@touch/, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', grepInvert: /@touch/, use: { ...devices['Desktop Safari'] } },
  ],
});
