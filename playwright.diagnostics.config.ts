import { defineConfig, devices } from '@playwright/test';

// 기존 지원 보장과 구분하여 동적 transform의 미검증 조건을 재현한다.
export default defineConfig({
  testDir: 'test/diagnostics', fullyParallel: true, retries: 0, workers: 4,
  use: { baseURL: 'http://127.0.0.1:4003', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run playground:preview', url: 'http://127.0.0.1:4003/examples/simple/react',
    reuseExistingServer: !process.env.CI, timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
