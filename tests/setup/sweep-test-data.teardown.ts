import { test, expect } from '../../src/fixtures';
import { testDataTag } from '../../src/data/test-data';
import { HTTP } from '../../src/utils/http';
import { logger } from '../../src/utils/logger';

// 409: still referenced by an invoice. Invoices cannot be deleted; the hourly database reset removes them.
const EXPECTED: readonly number[] = [HTTP.NO_CONTENT, HTTP.NOT_FOUND, HTTP.CONFLICT];
const PARALLEL = 5;

/** Deletes in small parallel batches and reports what went and what an invoice still pins. */
const removeAll = async (
  what: string,
  ids: string[],
  remove: (id: string) => Promise<{ status: () => number }>,
): Promise<void> => {
  let removed = 0;
  let kept = 0;
  for (let i = 0; i < ids.length; i += PARALLEL) {
    const statuses = await Promise.all(
      ids.slice(i, i + PARALLEL).map(async (id) => (await remove(id)).status()),
    );
    for (const status of statuses) {
      expect(EXPECTED, `${what}: unexpected status`).toContain(status);
      if (status === HTTP.CONFLICT) kept += 1;
      else removed += 1;
    }
  }
  logger.info(
    `Sweep ${what}: removed ${String(removed)}, kept ${String(kept)} (pinned by invoices until the hourly reset)`,
  );
};

// Safety net after every project: delete anything this run created that a fixture missed.
// Lists everything and filters by prefix: name search is full-text and cannot match the run tag.
test('remove test data left behind by this run', async ({
  adminBrandsClient,
  adminCategoriesClient,
  adminProductsClient,
  adminUsersClient,
}) => {
  // Housekeeping, not a test of the API: records pinned by invoices make it slower than a normal test.
  test.setTimeout(120_000);

  const taggedCategories = await test.step('Find categories tagged with this run id', async () => {
    const res = await adminCategoriesClient.list();
    await expect(res).toBeOK();
    return (await res.json()).filter((category) => category.name.startsWith(testDataTag()));
  });

  await test.step('Delete products left in categories tagged with this run id', async () => {
    const ids: string[] = [];
    for (const category of taggedCategories) {
      for (const is_rental of [false, true]) {
        const page = await adminProductsClient.list({ by_category_slug: category.slug, is_rental });
        await expect(page).toBeOK();
        ids.push(...(await page.json()).data.map((product) => product.id));
      }
    }
    await removeAll('products', ids, (id) => adminProductsClient.remove(id));
  });

  await test.step('Delete categories tagged with this run id, children first', async () => {
    const children = taggedCategories.filter((c) => c.parent_id !== null).map((c) => c.id);
    const roots = taggedCategories.filter((c) => c.parent_id === null).map((c) => c.id);
    await removeAll('subcategories', children, (id) => adminCategoriesClient.remove(id));
    await removeAll('categories', roots, (id) => adminCategoriesClient.remove(id));
  });

  await test.step('Delete brands tagged with this run id', async () => {
    const res = await adminBrandsClient.list();
    await expect(res).toBeOK();
    const ids = (await res.json()).filter((brand) => brand.name.startsWith(testDataTag())).map((b) => b.id);
    await removeAll('brands', ids, (id) => adminBrandsClient.remove(id));
  });

  await test.step('Delete test customers registered by this run', async () => {
    const res = await adminUsersClient.search(testDataTag());
    await expect(res).toBeOK();
    const ids = (await res.json()).data
      .filter((user) => user.email.startsWith(testDataTag()))
      .map((u) => u.id);
    await removeAll('customers', ids, (id) => adminUsersClient.remove(id));
  });
});
