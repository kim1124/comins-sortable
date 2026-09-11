import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'test/playground',
  testMatch: 'performance.spec.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
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
    { name: 'chromium-performance', use: { ...devices['Desktop Chrome'] } },
  ],
});
