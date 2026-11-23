import { test, expect } from '../../src/fixtures';
import { MessageSchema } from '../../src/schemas/common.schema';
import { ProductSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /products/{id}', { tag: ['@products', '@get'] }, () => {
  test(
    'a shopper opens a product and sees its price, brand and category',
    { tag: '@smoke' },
    async ({ productsClient, createdProduct }) => {
      const { product, input, brand, category } = createdProduct;

      await test.step('Open the product by its id', async () => {
        const res = await productsClient.getById(product.id);

        expect(res.status()).toBe(HTTP.OK);
        const shown = ProductSchema.parse(await res.json());
        expect(shown).toMatchObject({ id: product.id, name: input.name, price: input.price });
        expect(shown.brand).toMatchObject({ id: brand.id, name: brand.name });
        expect(shown.category).toMatchObject({ id: category.id, name: category.name });
      });
    },
  );

  test(
    'opening a product that does not exist returns not found',
    { tag: '@negative' },
    async ({ productsClient }) => {
      await test.step('Open a product with an id that was never created', async () => {
        const res = await productsClient.getById('01NOTAREALPRODUCTID0000000');

        expect(res.status()).toBe(HTTP.NOT_FOUND);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Requested item not found' });
      });
    },
  );
});
