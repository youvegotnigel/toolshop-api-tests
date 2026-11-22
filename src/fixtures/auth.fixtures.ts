import {
  test as base,
  type APIRequestContext,
  type PlaywrightWorkerArgs,
  type TestInfo,
} from '@playwright/test';
import { AuthSession } from '../auth/auth-session';
import { UsersClient } from '../clients/users.client';
import { buildCustomer } from '../data/user.builder';
import { env } from '../config/env';
import { ApiRecorder } from '../utils/api-recorder';
import { RegisteredUserSchema } from '../schemas/user.schema';
import { logger } from '../utils/logger';

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

const adminCredentials = (): { email: string; password: string } => ({
  email: env('ADMIN_EMAIL'),
  password: env('ADMIN_PASSWORD'),
});

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
      const ctx = await playwright.request.newContext({ baseURL: env('API_BASE_URL') });
      await use(new AuthSession(ctx, 'admin', adminCredentials()));
      await ctx.dispose();
    },
    { scope: 'worker', title: 'admin login (once per worker)' },
  ],

  // Shared demo customers get locked by other people's failed logins (HTTP 423), so every
  // worker registers its own throwaway customer and the admin deletes it afterwards.
  customerSession: [
    async ({ playwright, adminSession }, use) => {
      const ctx = await playwright.request.newContext({ baseURL: env('API_BASE_URL') });
      const customer = buildCustomer();
      const res = await new UsersClient(ctx).register(customer);
      if (!res.ok()) throw new Error(`Registering a test customer failed with HTTP ${String(res.status())}`);
      const user = RegisteredUserSchema.parse(await res.json());
      logger.info(`Registered test customer ${user.id}`);

      await use(new AuthSession(ctx, 'customer', { email: customer.email, password: customer.password }));

      const admin = await playwright.request.newContext({
        baseURL: env('API_BASE_URL'),
        extraHTTPHeaders: { Authorization: await adminSession.bearer() },
      });
      const removed = await new UsersClient(admin).remove(user.id);
      if (!removed.ok())
        logger.warn(`Could not delete test customer ${user.id}: HTTP ${String(removed.status())}`);
      await admin.dispose();
      await ctx.dispose();
    },
    { scope: 'worker', title: 'register and log in a throwaway customer (once per worker)' },
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
