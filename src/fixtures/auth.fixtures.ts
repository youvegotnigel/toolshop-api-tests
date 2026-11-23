import { test as base, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';
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
  /** One id per test, sent as X-Correlation-Id by every context: search it in the API's logs. */
  correlationId: string;
  /** One call log per test, shared by every context; attached to the report when the test fails. */
  apiRecorder: ApiRecorder;
  /** Anonymous context: what a shopper without an account can do. */
  api: APIRequestContext;
  /** Authenticated as the Toolshop admin. */
  adminApi: APIRequestContext;
  /** Authenticated as a regular customer. */
  customerApi: APIRequestContext;
  /** Factory: a recorded context for any token, e.g. a customer a test registered itself. */
  apiAs: (authorization: string) => Promise<APIRequestContext>;
};

type Playwright = PlaywrightWorkerArgs['playwright'];

const adminCredentials = (): { email: string; password: string } => ({
  email: env('ADMIN_EMAIL'),
  password: env('ADMIN_PASSWORD'),
});

type RecordingOptions = {
  correlationId: string;
  apiRecorder: ApiRecorder;
  authorization?: string;
};

const newRecordedContext = async (
  playwright: Playwright,
  baseURL: string | undefined,
  options: RecordingOptions,
): Promise<{ ctx: APIRequestContext; recorded: APIRequestContext }> => {
  const ctx = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: {
      Accept: 'application/json',
      'X-Correlation-Id': options.correlationId,
      ...(options.authorization === undefined ? {} : { Authorization: options.authorization }),
    },
  });
  return { ctx, recorded: options.apiRecorder.wrap(ctx) };
};

/** Builds a context that shares the test's correlation id and call recorder, and disposes it afterwards. */
const recordedContext = async (
  playwright: Playwright,
  baseURL: string | undefined,
  options: RecordingOptions,
  use: (ctx: APIRequestContext) => Promise<void>,
): Promise<void> => {
  const { ctx, recorded } = await newRecordedContext(playwright, baseURL, options);
  await use(recorded);
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

  // eslint-disable-next-line no-empty-pattern -- Playwright fixtures must destructure their first argument
  correlationId: async ({}, use, testInfo) => {
    const id = crypto.randomUUID();
    testInfo.annotations.push({ type: 'correlation-id', description: id });
    await use(id);
  },

  // eslint-disable-next-line no-empty-pattern -- Playwright fixtures must destructure their first argument
  apiRecorder: async ({}, use, testInfo) => {
    const recorder = new ApiRecorder();
    await use(recorder);
    await recorder.attachOnFailure(testInfo);
  },

  api: async ({ playwright, baseURL, correlationId, apiRecorder }, use) => {
    await recordedContext(playwright, baseURL, { correlationId, apiRecorder }, use);
  },

  adminApi: async ({ playwright, baseURL, correlationId, apiRecorder, adminSession }, use) => {
    const authorization = await adminSession.bearer();
    await recordedContext(playwright, baseURL, { correlationId, apiRecorder, authorization }, use);
  },

  customerApi: async ({ playwright, baseURL, correlationId, apiRecorder, customerSession }, use) => {
    const authorization = await customerSession.bearer();
    await recordedContext(playwright, baseURL, { correlationId, apiRecorder, authorization }, use);
  },
  apiAs: async ({ playwright, baseURL, correlationId, apiRecorder }, use) => {
    const opened: APIRequestContext[] = [];
    await use(async (authorization) => {
      const { ctx, recorded } = await newRecordedContext(playwright, baseURL, {
        correlationId,
        apiRecorder,
        authorization,
      });
      opened.push(ctx);
      return recorded;
    });
    for (const ctx of opened) await ctx.dispose();
  },
});
