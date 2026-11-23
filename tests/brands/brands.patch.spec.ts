import { test, expect } from '../../src/fixtures';
import { testDataTag } from '../../src/data/test-data';
import { UpdateResultSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('PATCH /brands/{id}', { tag: ['@brands', '@patch'] }, () => {
  test('renaming a brand changes only its name', async ({ brandsClient, createdBrand }) => {
    const newName = `${testDataTag()} Renamed Brand`;

    await test.step('Rename the brand without touching its slug', async () => {
      const res = await brandsClient.update(createdBrand.id, { name: newName });

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });

    await test.step('Read the brand back: new name, same slug', async () => {
      const res = await brandsClient.getById(createdBrand.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(await res.json()).toEqual({ ...createdBrand, name: newName });
    });
  });
});
