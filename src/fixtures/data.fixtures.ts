import { expect } from '@playwright/test';
import { test as clientsTest } from './clients.fixtures';
import { buildBrand } from '../data/brand.builder';
import { buildCategory } from '../data/category.builder';
import { buildCustomer } from '../data/user.builder';
import type { UsersClient } from '../clients/users.client';
import { TokenSchema, type Credentials, type Token } from '../schemas/auth.schema';
import { RegisteredUserSchema, type RegisteredUser, type UserRegistration } from '../schemas/user.schema';
import { BrandSchema, type Brand, type BrandInput } from '../schemas/brand.schema';
import { CategorySchema, type Category, type CategoryInput } from '../schemas/category.schema';
import { logger } from '../utils/logger';

export type Cleanup = { add: (label: string, task: () => Promise<unknown>) => void };

type DataFixtures = {
  /** Deferred teardown registry: runs even when the test fails, newest first. */
  cleanup: Cleanup;
  /** Factory: creates a brand through the API and registers its deletion. */
  createBrand: (overrides?: Partial<BrandInput>) => Promise<Brand>;
  /** Ready-made brand for tests that only need one. */
  createdBrand: Brand;
  /** Factory: creates a category (top-level unless parent_id is given) and registers its deletion. */
  createCategory: (overrides?: Partial<CategoryInput>) => Promise<Category>;
  /** Ready-made top-level category. */
  createdCategory: Category;
  /** Factory: registers a customer of the test's own (the admin deletes it afterwards). */
  createCustomer: (overrides?: Partial<UserRegistration>) => Promise<NewCustomer>;
  /** Factory: logs in and returns the token plus a users client that sends it. */
  signIn: (credentials: Credentials) => Promise<SignedIn>;
  /** A fresh customer, already logged in. Safe to edit, log out or lock: nobody else uses it. */
  signedInCustomer: NewCustomer & SignedIn;
};

export type NewCustomer = { user: RegisteredUser; credentials: Credentials };
export type SignedIn = { token: Token; users: UsersClient };

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

  createCategory: async ({ categoriesClient, adminCategoriesClient, cleanup }, use) => {
    await use(async (overrides = {}) => {
      const res = await categoriesClient.create(buildCategory(overrides));
      await expect(res, 'test data setup: create category').toBeOK();
      const category = CategorySchema.parse(await res.json());
      // Cleanup runs newest first, so a subcategory is always removed before its parent.
      cleanup.add(`delete category ${category.id}`, () => adminCategoriesClient.remove(category.id));
      return category;
    });
  },

  createdCategory: async ({ createCategory }, use) => {
    await use(await createCategory());
  },

  createCustomer: async ({ usersClient, adminUsersClient, cleanup }, use) => {
    await use(async (overrides = {}) => {
      const registration = buildCustomer(overrides);
      const res = await usersClient.register(registration);
      await expect(res, 'test data setup: register customer').toBeOK();
      const user = RegisteredUserSchema.parse(await res.json());
      cleanup.add(`delete customer ${user.id}`, () => adminUsersClient.remove(user.id));
      return { user, credentials: { email: registration.email, password: registration.password } };
    });
  },

  signIn: async ({ authClient, usersClientFor }, use) => {
    await use(async (credentials) => {
      const res = await authClient.login(credentials);
      await expect(res, 'test data setup: log in').toBeOK();
      const token = TokenSchema.parse(await res.json());
      return { token, users: await usersClientFor(token.access_token) };
    });
  },

  signedInCustomer: async ({ createCustomer, signIn }, use) => {
    const customer = await createCustomer();
    await use({ ...customer, ...(await signIn(customer.credentials)) });
  },
});
