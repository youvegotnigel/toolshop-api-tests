import { test, expect } from '../../src/fixtures';
import { SpecNameListSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /product-specs/names', { tag: ['@products', '@get'] }, () => {
  test('a new spec name shows up in the list of spec filters with its value and unit', async ({
    productsClient,
    createdProduct,
    createSpec,
  }) => {
    const spec = await createSpec(createdProduct.product.id);

    await test.step('Open the list of spec names shoppers can filter on', async () => {
      const res = await productsClient.specNames();

      expect(res.status()).toBe(HTTP.OK);
      expect(SpecNameListSchema.parse(await res.json())).toContainEqual({
        name: spec.spec_name,
        values: [spec.spec_value],
        unit: spec.spec_unit,
      });
    });
  });
});
