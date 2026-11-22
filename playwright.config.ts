import { defineConfig, type ReporterDescription } from '@playwright/test';
import { env, loadEnvironment } from './src/config/env';

const testEnv = loadEnvironment();
process.env.RUN_ID ??= `r${Date.now().toString(36)}`; // set once, inherited by every worker
const isCI = !!process.env.CI;

const optionalReporters: ReporterDescription[] = process.env.ALLURE
  ? [['allure-playwright', { resultsDir: 'allure-results', environmentInfo: { TEST_ENV: testEnv } }]]
  : [];

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results/artifacts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined, // a shared public API: be a polite client
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: [
    [isCI ? 'line' : 'list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }], // GitHub Actions + Jenkins
    ['json', { outputFile: 'test-results/results.json' }], // coverage dashboard input
    ['./src/reporting/failure-tracker.ts'],
    ...optionalReporters,
  ],

  use: {
    baseURL: env('API_BASE_URL'),
    extraHTTPHeaders: { Accept: 'application/json' },
    trace: 'retain-on-failure',
  },

  // TEST_ENV=stub boots the offline stub (agents without network, local dev, CI smoke)
  webServer:
    testEnv === 'stub'
      ? {
          command: 'node stub/toolshop-stub.mjs',
          url: `${env('API_BASE_URL')}/status`,
          reuseExistingServer: !isCI,
        }
      : undefined,

  projects: [
    { name: 'setup', testMatch: /setup\/.*\.setup\.ts/, teardown: 'teardown' },
    { name: 'teardown', testMatch: /setup\/.*\.teardown\.ts/ },
    { name: 'api', dependencies: ['setup'], testMatch: /.*\.spec\.ts/ },
  ],
});
