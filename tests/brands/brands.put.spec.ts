import { test, expect } from '../../src/fixtures';
import { buildBrand } from '../../src/data/brand.builder';
import { UpdateResultSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('PUT /brands/{id}', { tag: ['@brands', '@put'] }, () => {
  test('replacing a brand updates both its name and slug', async ({ brandsClient, createdBrand }) => {
    const replacement = buildBrand();

    await test.step('Replace the whole brand with new details', async () => {
      const res = await brandsClient.replace(createdBrand.id, replacement);

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });

    await test.step('Read the brand back and see the new details', async () => {
      const res = await brandsClient.getById(createdBrand.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(await res.json()).toEqual({ id: createdBrand.id, ...replacement });
    });
  });
});
