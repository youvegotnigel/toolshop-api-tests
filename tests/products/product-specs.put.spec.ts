import { test, expect } from '../../src/fixtures';
import { UpdateResultSchema } from '../../src/schemas/common.schema';
import { ProductSpecSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('PUT /products/{productId}/specs/{specId}', { tag: ['@products', '@put'] }, () => {
  test('changing a spec value keeps its name and unit', async ({
    customerProductsClient,
    productsClient,
    createdProduct,
    createSpec,
  }) => {
    const { product } = createdProduct;
    const spec = await createSpec(product.id);

    await test.step('Change the value of the spec', async () => {
      const res = await customerProductsClient.updateSpec(product.id, spec.id, { spec_value: '1250' });

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });

    await test.step('The spec shows the new value', async () => {
      const res = await productsClient.spec(product.id, spec.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(ProductSpecSchema.parse(await res.json())).toEqual({ ...spec, spec_value: '1250' });
    });
  });
});
