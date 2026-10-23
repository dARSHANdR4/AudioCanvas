import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100';
const useLocalServer = process.env.PLAYWRIGHT_BASE_URL === undefined;

export default defineConfig({
  testDir: './tests/performance',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  outputDir: 'test-results/performance',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: useLocalServer
    ? {
        command: 'npm run start --workspace=@audiocanvas/web -- --hostname 127.0.0.1 --port 3100',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
