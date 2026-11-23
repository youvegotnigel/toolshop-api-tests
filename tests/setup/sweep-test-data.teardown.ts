import { test, expect } from '../../src/fixtures';
import { testDataTag } from '../../src/data/test-data';
import { HTTP } from '../../src/utils/http';
import { logger } from '../../src/utils/logger';

const GONE: readonly number[] = [HTTP.NO_CONTENT, HTTP.NOT_FOUND];

// Safety net after every project: delete anything this run created that a fixture missed.
// Lists everything and filters by prefix: name search is full-text and cannot match the run tag.
test('remove test data left behind by this run', async ({
  adminBrandsClient,
  adminCategoriesClient,
  adminUsersClient,
}) => {
  await test.step('Delete categories tagged with this run id, children first', async () => {
    const res = await adminCategoriesClient.list();
    await expect(res).toBeOK();
    const leftovers = (await res.json())
      .filter((category) => category.name.startsWith(testDataTag()))
      .sort((a, b) => Number(a.parent_id === null) - Number(b.parent_id === null));
    for (const category of leftovers) {
      expect(GONE).toContain((await adminCategoriesClient.remove(category.id)).status());
    }
    logger.info(`Sweep removed ${String(leftovers.length)} leftover category(ies)`);
  });

  await test.step('Delete brands tagged with this run id', async () => {
    const res = await adminBrandsClient.list();
    await expect(res).toBeOK();
    const leftovers = (await res.json()).filter((brand) => brand.name.startsWith(testDataTag()));
    for (const brand of leftovers) {
      expect(GONE).toContain((await adminBrandsClient.remove(brand.id)).status());
    }
    logger.info(`Sweep removed ${String(leftovers.length)} leftover brand(s)`);
  });

  await test.step('Delete test customers registered by this run', async () => {
    const res = await adminUsersClient.search(testDataTag());
    await expect(res).toBeOK();
    const leftovers = (await res.json()).data.filter((user) => user.email.startsWith(testDataTag()));
    for (const user of leftovers) {
      expect(GONE).toContain((await adminUsersClient.remove(user.id)).status());
    }
    logger.info(`Sweep removed ${String(leftovers.length)} leftover customer(s)`);
  });
});
