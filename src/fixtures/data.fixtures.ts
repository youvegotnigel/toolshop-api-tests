import { expect } from '@playwright/test';
import { test as clientsTest } from './clients.fixtures';
import { buildBrand } from '../data/brand.builder';
import { BrandSchema, type Brand, type BrandInput } from '../schemas/brand.schema';
import { logger } from '../utils/logger';

export type Cleanup = { add: (label: string, task: () => Promise<unknown>) => void };

type DataFixtures = {
  /** Deferred teardown registry: runs even when the test fails, newest first. */
  cleanup: Cleanup;
  /** Factory: creates a brand through the API and registers its deletion. */
  createBrand: (overrides?: Partial<BrandInput>) => Promise<Brand>;
  /** Ready-made brand for tests that only need one. */
  createdBrand: Brand;
};

export const test = clientsTest.extend<DataFixtures>({
  cleanup: [
    // eslint-disable-next-line no-empty-pattern -- Playwright fixtures must destructure their first argument
    async ({}, use) => {
      const tasks: { label: string; task: () => Promise<unknown> }[] = [];
      await use({ add: (label, task) => tasks.push({ label, task }) });
      for (const { label, task } of tasks.reverse()) {
        await task().catch((error: unknown) => {
          logger.warn(`cleanup failed: ${label}`, { error: String(error) });
        });
      }
    },
    { box: true },
  ],

  createBrand: async ({ brandsClient, adminBrandsClient, cleanup }, use) => {
    await use(async (overrides = {}) => {
      const res = await brandsClient.create(buildBrand(overrides));
      await expect(res, 'test data setup: create brand').toBeOK();
      const brand = BrandSchema.parse(await res.json());
      cleanup.add(`delete brand ${brand.id}`, () => adminBrandsClient.remove(brand.id));
      return brand;
    });
  },

  createdBrand: async ({ createBrand }, use) => {
    await use(await createBrand());
  },
});
