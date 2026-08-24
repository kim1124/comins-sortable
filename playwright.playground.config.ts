import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'test/playground',
  testMatch: 'playground.spec.ts',
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4003',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:4003/examples/simple/react',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
