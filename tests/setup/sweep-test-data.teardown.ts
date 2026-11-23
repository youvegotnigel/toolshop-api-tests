import { test, expect } from '../../src/fixtures';
import { testDataTag } from '../../src/data/test-data';
import { HTTP } from '../../src/utils/http';
import { logger } from '../../src/utils/logger';

const GONE: readonly number[] = [HTTP.NO_CONTENT, HTTP.NOT_FOUND];
// 409: still referenced by an invoice. Invoices cannot be deleted; the hourly database reset removes them.
const GONE_OR_PINNED: readonly number[] = [...GONE, HTTP.CONFLICT];

// Safety net after every project: delete anything this run created that a fixture missed.
// Lists everything and filters by prefix: name search is full-text and cannot match the run tag.
test('remove test data left behind by this run', async ({
  adminBrandsClient,
  adminCategoriesClient,
  adminProductsClient,
  adminUsersClient,
}) => {
  const taggedCategories = await test.step('Find categories tagged with this run id', async () => {
    const res = await adminCategoriesClient.list();
    await expect(res).toBeOK();
    return (await res.json()).filter((category) => category.name.startsWith(testDataTag()));
  });

  await test.step('Delete products left in categories tagged with this run id', async () => {
    let removed = 0;
    for (const category of taggedCategories) {
      for (const is_rental of [false, true]) {
        const page = await adminProductsClient.list({ by_category_slug: category.slug, is_rental });
        await expect(page).toBeOK();
        for (const product of (await page.json()).data) {
          expect(GONE_OR_PINNED).toContain((await adminProductsClient.remove(product.id)).status());
          removed += 1;
        }
      }
    }
    logger.info(`Sweep removed ${String(removed)} leftover product(s)`);
  });

  await test.step('Delete categories tagged with this run id, children first', async () => {
    const leftovers = [...taggedCategories].sort(
      (a, b) => Number(a.parent_id === null) - Number(b.parent_id === null),
    );
    for (const category of leftovers) {
      expect(GONE_OR_PINNED).toContain((await adminCategoriesClient.remove(category.id)).status());
    }
    logger.info(`Sweep removed ${String(leftovers.length)} leftover category(ies)`);
  });

  await test.step('Delete brands tagged with this run id', async () => {
    const res = await adminBrandsClient.list();
    await expect(res).toBeOK();
    const leftovers = (await res.json()).filter((brand) => brand.name.startsWith(testDataTag()));
    for (const brand of leftovers) {
      expect(GONE_OR_PINNED).toContain((await adminBrandsClient.remove(brand.id)).status());
    }
    logger.info(`Sweep removed ${String(leftovers.length)} leftover brand(s)`);
  });

  await test.step('Delete test customers registered by this run', async () => {
    const res = await adminUsersClient.search(testDataTag());
    await expect(res).toBeOK();
    const leftovers = (await res.json()).data.filter((user) => user.email.startsWith(testDataTag()));
    for (const user of leftovers) {
      expect(GONE_OR_PINNED).toContain((await adminUsersClient.remove(user.id)).status());
    }
    logger.info(`Sweep removed ${String(leftovers.length)} leftover customer(s)`);
  });
});
