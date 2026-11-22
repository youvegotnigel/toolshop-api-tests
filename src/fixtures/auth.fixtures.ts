import {
  test as base,
  type APIRequestContext,
  type PlaywrightWorkerArgs,
  type TestInfo,
} from '@playwright/test';
import { AuthSession } from '../auth/auth-session';
import { env } from '../config/env';
import { ApiRecorder } from '../utils/api-recorder';
import type { Role } from '../schemas/auth.schema';

type WorkerFixtures = {
  /** auto: fails the worker fast when the API is down, before any test runs. */
  envGuard: undefined;
  adminSession: AuthSession;
  customerSession: AuthSession;
};

type TestFixtures = {
  /** Anonymous context: what a shopper without an account can do. */
  api: APIRequestContext;
  /** Authenticated as the Toolshop admin. */
  adminApi: APIRequestContext;
  /** Authenticated as a regular customer. */
  customerApi: APIRequestContext;
};

type Playwright = PlaywrightWorkerArgs['playwright'];

const credentialsFor = (role: Role): { email: string; password: string } =>
  role === 'admin'
    ? { email: env('ADMIN_EMAIL'), password: env('ADMIN_PASSWORD') }
    : { email: env('CUSTOMER_EMAIL'), password: env('CUSTOMER_PASSWORD') };

const workerSession = async (
  playwright: Playwright,
  role: Role,
  use: (session: AuthSession) => Promise<void>,
): Promise<void> => {
  const ctx = await playwright.request.newContext({ baseURL: env('API_BASE_URL') });
  await use(new AuthSession(ctx, role, credentialsFor(role)));
  await ctx.dispose();
};

/** Builds a recorded, correlated context and guarantees evidence + disposal after the test. */
const recordedContext = async (
  playwright: Playwright,
  baseURL: string | undefined,
  testInfo: TestInfo,
  use: (ctx: APIRequestContext) => Promise<void>,
  authorization?: string,
): Promise<void> => {
  const correlationId = crypto.randomUUID();
  testInfo.annotations.push({ type: 'correlation-id', description: correlationId });
  const ctx = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: {
      Accept: 'application/json',
      'X-Correlation-Id': correlationId,
      ...(authorization === undefined ? {} : { Authorization: authorization }),
    },
  });
  const recorder = new ApiRecorder();
  await use(recorder.wrap(ctx));
  await recorder.attachOnFailure(testInfo);
  await ctx.dispose();
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  envGuard: [
    async ({ playwright }, use) => {
      const ctx = await playwright.request.newContext({ baseURL: env('API_BASE_URL') });
      const status = await ctx.get('/status');
      await ctx.dispose();
      if (!status.ok())
        throw new Error(`Toolshop API unhealthy: GET /status returned ${String(status.status())}`);
      await use(undefined);
    },
    { scope: 'worker', auto: true, title: 'API health check' },
  ],

  adminSession: [
    async ({ playwright }, use) => {
      await workerSession(playwright, 'admin', use);
    },
    { scope: 'worker', title: 'admin login (once per worker)' },
  ],

  customerSession: [
    async ({ playwright }, use) => {
      await workerSession(playwright, 'customer', use);
    },
    { scope: 'worker', title: 'customer login (once per worker)' },
  ],

  api: async ({ playwright, baseURL }, use, testInfo) => {
    await recordedContext(playwright, baseURL, testInfo, use);
  },

  adminApi: async ({ playwright, baseURL, adminSession }, use, testInfo) => {
    await recordedContext(playwright, baseURL, testInfo, use, await adminSession.bearer());
  },

  customerApi: async ({ playwright, baseURL, customerSession }, use, testInfo) => {
    await recordedContext(playwright, baseURL, testInfo, use, await customerSession.bearer());
  },
});
