import { test, expect } from '../../src/fixtures';
import { testDataTag } from '../../src/data/brand.builder';
import { HTTP } from '../../src/utils/http';
import { logger } from '../../src/utils/logger';

// Safety net after every project: delete anything this run created that a fixture missed.
test('remove test data left behind by this run', async ({ adminBrandsClient, adminUsersClient }) => {
  await test.step('Delete brands tagged with this run id', async () => {
    const res = await adminBrandsClient.search(testDataTag());
    await expect(res).toBeOK();
    const leftovers = (await res.json()).filter((brand) => brand.name.startsWith(testDataTag()));
    for (const brand of leftovers) {
      expect([HTTP.NO_CONTENT, HTTP.NOT_FOUND]).toContain(
        (await adminBrandsClient.remove(brand.id)).status(),
      );
    }
    logger.info(`Sweep removed ${String(leftovers.length)} leftover brand(s)`);
  });

  await test.step('Delete test customers registered by this run', async () => {
    const res = await adminUsersClient.search(testDataTag());
    await expect(res).toBeOK();
    const leftovers = (await res.json()).data.filter((user) => user.email.startsWith(testDataTag()));
    for (const user of leftovers) {
      expect([HTTP.NO_CONTENT, HTTP.NOT_FOUND]).toContain((await adminUsersClient.remove(user.id)).status());
    }
    logger.info(`Sweep removed ${String(leftovers.length)} leftover customer(s)`);
  });
});
