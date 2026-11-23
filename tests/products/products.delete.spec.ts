import { test, expect } from '../../src/fixtures';
import { MessageSchema } from '../../src/schemas/common.schema';
import { ProductSpecListSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('DELETE /products/{id}', { tag: ['@products', '@delete'] }, () => {
  test(
    'an admin deletes a product and its specs go with it',
    { tag: '@smoke' },
    async ({ adminProductsClient, productsClient, createdProduct, createSpec }) => {
      const { product } = createdProduct;
      await createSpec(product.id);

      await test.step('An admin deletes the product', async () => {
        expect((await adminProductsClient.remove(product.id)).status()).toBe(HTTP.NO_CONTENT);
      });

      await test.step('The product can no longer be opened', async () => {
        expect((await productsClient.getById(product.id)).status()).toBe(HTTP.NOT_FOUND);
      });

      await test.step('Its specs are gone too', async () => {
        const res = await productsClient.specs(product.id);

        expect(res.status()).toBe(HTTP.OK);
        expect(ProductSpecListSchema.parse(await res.json())).toEqual([]);
      });
    },
  );

  test(
    'a customer cannot delete a product',
    { tag: '@auth' },
    async ({ customerProductsClient, productsClient, createdProduct }) => {
      await test.step('A logged-in customer tries to delete the product and is refused', async () => {
        const res = await customerProductsClient.remove(createdProduct.product.id);

        expect(res.status()).toBe(HTTP.FORBIDDEN);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Forbidden' });
      });

      await test.step('The product is still there', async () => {
        expect((await productsClient.getById(createdProduct.product.id)).status()).toBe(HTTP.OK);
      });
    },
  );
});
