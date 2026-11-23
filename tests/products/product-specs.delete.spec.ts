import { test, expect } from '../../src/fixtures';
import { HTTP } from '../../src/utils/http';

test.describe('DELETE /products/{productId}/specs/{specId}', { tag: ['@products', '@delete'] }, () => {
  test('a removed spec can no longer be opened', async ({
    customerProductsClient,
    productsClient,
    createdProduct,
    createSpec,
  }) => {
    const { product } = createdProduct;
    const spec = await createSpec(product.id);

    await test.step('Remove the spec from the product', async () => {
      expect((await customerProductsClient.removeSpec(product.id, spec.id)).status()).toBe(HTTP.NO_CONTENT);
    });

    await test.step('Opening the removed spec returns not found', async () => {
      expect((await productsClient.spec(product.id, spec.id)).status()).toBe(HTTP.NOT_FOUND);
    });
  });
});
