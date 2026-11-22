import { test, expect } from '../../src/fixtures';
import { testDataTag } from '../../src/data/brand.builder';
import { HTTP } from '../../src/utils/http';
import { logger } from '../../src/utils/logger';

// Safety net after every project: delete anything this run created that a fixture missed.
test('remove test data left behind by this run', async ({ adminBrandsClient }) => {
  const leftovers = await test.step('Find brands tagged with this run id', async () => {
    const res = await adminBrandsClient.search(testDataTag());
    await expect(res).toBeOK();
    return (await res.json()).filter((brand) => brand.name.startsWith(testDataTag()));
  });

  await test.step(`Delete ${String(leftovers.length)} leftover brand(s)`, async () => {
    for (const brand of leftovers) {
      const res = await adminBrandsClient.remove(brand.id);
      expect([HTTP.NO_CONTENT, HTTP.NOT_FOUND]).toContain(res.status());
    }
    logger.info(`Sweep removed ${String(leftovers.length)} leftover brand(s)`);
  });
});
