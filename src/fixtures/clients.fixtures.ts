import { test as authTest } from './auth.fixtures';
import { AuthClient } from '../clients/auth.client';
import { BrandsClient } from '../clients/brands.client';
import { CategoriesClient } from '../clients/categories.client';
import { ImagesClient, ProductsClient } from '../clients/products.client';
import { UsersClient } from '../clients/users.client';

type ClientFixtures = {
  /** Anonymous shopper. */
  brandsClient: BrandsClient;
  /** Admin: the only role allowed to delete. */
  adminBrandsClient: BrandsClient;
  /** Logged-in customer. */
  customerBrandsClient: BrandsClient;
  /** Anonymous: register and login. */
  authClient: AuthClient;
  usersClient: UsersClient;
  /** Admin user management (list, search, delete). */
  adminUsersClient: UsersClient;
  /** The worker's throwaway customer: read-only checks only, never log it out or edit it. */
  customerUsersClient: UsersClient;
  /** Factory: a users client that sends this access token (a login the test did itself). */
  usersClientFor: (accessToken: string) => Promise<UsersClient>;
  categoriesClient: CategoriesClient;
  adminCategoriesClient: CategoriesClient;
  customerCategoriesClient: CategoriesClient;
  productsClient: ProductsClient;
  adminProductsClient: ProductsClient;
  /** Spec writes need any login; the worker's customer is fine for them. */
  customerProductsClient: ProductsClient;
  imagesClient: ImagesClient;
};

// Lazy: a client (and its login) is only created when a test asks for it.
export const test = authTest.extend<ClientFixtures>({
  brandsClient: async ({ api }, use) => {
    await use(new BrandsClient(api));
  },
  adminBrandsClient: async ({ adminApi }, use) => {
    await use(new BrandsClient(adminApi));
  },
  customerBrandsClient: async ({ customerApi }, use) => {
    await use(new BrandsClient(customerApi));
  },
  authClient: async ({ api }, use) => {
    await use(new AuthClient(api));
  },
  usersClient: async ({ api }, use) => {
    await use(new UsersClient(api));
  },
  adminUsersClient: async ({ adminApi }, use) => {
    await use(new UsersClient(adminApi));
  },
  customerUsersClient: async ({ customerApi }, use) => {
    await use(new UsersClient(customerApi));
  },
  usersClientFor: async ({ apiAs }, use) => {
    await use(async (accessToken) => new UsersClient(await apiAs(`Bearer ${accessToken}`)));
  },
  categoriesClient: async ({ api }, use) => {
    await use(new CategoriesClient(api));
  },
  adminCategoriesClient: async ({ adminApi }, use) => {
    await use(new CategoriesClient(adminApi));
  },
  customerCategoriesClient: async ({ customerApi }, use) => {
    await use(new CategoriesClient(customerApi));
  },
  productsClient: async ({ api }, use) => {
    await use(new ProductsClient(api));
  },
  adminProductsClient: async ({ adminApi }, use) => {
    await use(new ProductsClient(adminApi));
  },
  customerProductsClient: async ({ customerApi }, use) => {
    await use(new ProductsClient(customerApi));
  },
  imagesClient: async ({ api }, use) => {
    await use(new ImagesClient(api));
  },
});
