import { test, expect } from '../../src/fixtures';
import { UpdateResultSchema, ValidationErrorsSchema } from '../../src/schemas/common.schema';
import { ProductSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('PATCH /products/{id}', { tag: ['@products', '@patch'] }, () => {
  test('changing just the price keeps everything else', async ({ productsClient, createdProduct }) => {
    const { product, input } = createdProduct;
    const price = 9.99;

    await test.step('Change only the product price', async () => {
      const res = await productsClient.update(product.id, { price });

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });

    await test.step('The price changed and the name did not', async () => {
      const res = await productsClient.getById(product.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(ProductSchema.parse(await res.json())).toMatchObject({ name: input.name, price });
    });
  });

  test(
    'a price that is not a number is rejected',
    { tag: '@negative' },
    async ({ productsClient, createdProduct }) => {
      await test.step('Try to set the price to a word', async () => {
        const res = await productsClient.update(createdProduct.product.id, { price: 'free' });

        expect(res.status()).toBe(HTTP.UNPROCESSABLE);
        expect(Object.keys(ValidationErrorsSchema.parse(await res.json()))).toEqual(['price']);
      });
    },
  );
});
