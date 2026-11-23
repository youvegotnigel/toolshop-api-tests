import { expect } from '@playwright/test';
import { test as clientsTest } from './clients.fixtures';
import { buildBrand } from '../data/brand.builder';
import { buildCategory } from '../data/category.builder';
import { buildCustomer } from '../data/user.builder';
import { buildProduct, buildProductSpec } from '../data/product.builder';
import {
  ImageListSchema,
  ProductSchema,
  ProductSpecSchema,
  type Product,
  type ProductInput,
  type ProductSpec,
  type ProductSpecInput,
} from '../schemas/product.schema';
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
  /** The id of a product photo; images are read-only reference data, so any one will do. */
  productImageId: string;
  /** Factory: creates a product with a brand and category of its own (or the ones given). */
  createProduct: (options?: {
    brand?: Brand;
    category?: Category;
    overrides?: Partial<ProductInput>;
  }) => Promise<NewProduct>;
  /** Ready-made product. */
  createdProduct: NewProduct;
  /** Factory: adds a spec to a product (as the worker's customer) and registers its deletion. */
  createSpec: (productId: string, overrides?: Partial<ProductSpecInput>) => Promise<ProductSpec>;
};

/** What a product was built from: tests compare against it and reuse the links. */
export type NewProduct = { product: Product; input: ProductInput; brand: Brand; category: Category };

export type NewCustomer = { user: RegisteredUser; credentials: Credentials };
export type SignedIn = { token: Token; users: UsersClient };

export const test = clientsTest.extend<DataFixtures>({
  cleanup: [
    // Fixtures tear down newest first. Depending on every context makes them older than `cleanup`,
    // so they are still open when the tasks run. Without this, a client first requested after
    // `cleanup` (e.g. by createSpec) is already closed and its cleanup task silently fails.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructuring is how Playwright declares fixture dependencies
    async ({ api, adminApi, customerApi }, use) => {
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

  productImageId: async ({ imagesClient }, use) => {
    const res = await imagesClient.list();
    await expect(res, 'test data setup: list product images').toBeOK();
    const [image] = ImageListSchema.parse(await res.json());
    if (image === undefined) throw new Error('GET /images returned no images; products cannot be created');
    await use(image.id);
  },

  createProduct: async (
    { productsClient, adminProductsClient, createBrand, createCategory, productImageId, cleanup },
    use,
  ) => {
    await use(async ({ brand, category, overrides = {} } = {}) => {
      const productBrand = brand ?? (await createBrand());
      const productCategory = category ?? (await createCategory());
      const input = buildProduct(
        { brand_id: productBrand.id, category_id: productCategory.id, product_image_id: productImageId },
        overrides,
      );
      const res = await productsClient.create(input);
      await expect(res, 'test data setup: create product').toBeOK();
      const product = ProductSchema.parse(await res.json());
      // Registered after brand and category, so it is deleted before them (newest first).
      cleanup.add(`delete product ${product.id}`, () => adminProductsClient.remove(product.id));
      return { product, input, brand: productBrand, category: productCategory };
    });
  },

  createdProduct: async ({ createProduct }, use) => {
    await use(await createProduct());
  },

  createSpec: async ({ customerProductsClient, cleanup }, use) => {
    await use(async (productId, overrides = {}) => {
      const res = await customerProductsClient.addSpec(productId, buildProductSpec(overrides));
      await expect(res, 'test data setup: add product spec').toBeOK();
      const spec = ProductSpecSchema.parse(await res.json());
      // Deleting the product cascades to its specs; removing it explicitly keeps cleanup honest
      // when a test deleted the product itself. 204 either way.
      cleanup.add(`delete spec ${spec.id}`, () => customerProductsClient.removeSpec(productId, spec.id));
      return spec;
    });
  },
});
