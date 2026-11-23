import { test, expect } from '../../src/fixtures';
import { MessageSchema } from '../../src/schemas/common.schema';
import { ProductSpecSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /products/{productId}/specs/{specId}', { tag: ['@products', '@get'] }, () => {
  test('a shopper opens one spec of a product', async ({ productsClient, createdProduct, createSpec }) => {
    const spec = await createSpec(createdProduct.product.id);

    await test.step('Open the spec by its id', async () => {
      const res = await productsClient.spec(createdProduct.product.id, spec.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(ProductSpecSchema.parse(await res.json())).toEqual(spec);
    });
  });

  test(
    'a spec cannot be opened through a different product',
    { tag: '@negative' },
    async ({ productsClient, createdProduct, createProduct, createSpec }) => {
      const spec = await createSpec(createdProduct.product.id);
      const other = await createProduct({ brand: createdProduct.brand, category: createdProduct.category });

      await test.step('Open the spec under another product’s id', async () => {
        const res = await productsClient.spec(other.product.id, spec.id);

        expect(res.status()).toBe(HTTP.NOT_FOUND);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Requested item not found' });
      });
    },
  );
});
