import { test as authTest } from './auth.fixtures';
import { BrandsClient } from '../clients/brands.client';
import { CategoriesClient } from '../clients/categories.client';
import { UsersClient } from '../clients/users.client';

type ClientFixtures = {
  /** Anonymous shopper. */
  brandsClient: BrandsClient;
  /** Admin: the only role allowed to delete. */
  adminBrandsClient: BrandsClient;
  /** Logged-in customer. */
  customerBrandsClient: BrandsClient;
  /** Admin user management (search, delete). */
  adminUsersClient: UsersClient;
  categoriesClient: CategoriesClient;
  adminCategoriesClient: CategoriesClient;
  customerCategoriesClient: CategoriesClient;
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
  adminUsersClient: async ({ adminApi }, use) => {
    await use(new UsersClient(adminApi));
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
});
