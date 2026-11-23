import { test, expect } from '../../src/fixtures';
import { searchToken } from '../../src/data/test-data';
import { ProductPageSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /products/search', { tag: ['@products', '@get'] }, () => {
  test('a shopper finds a product by a word in its name', async ({ productsClient, createdProduct }) => {
    const word = createdProduct.input.name.split(' ')[1] ?? '';

    await test.step('Search products for a word that only this product has', async () => {
      const res = await productsClient.search(word);

      expect(res.status()).toBe(HTTP.OK);
      expect(ProductPageSchema.parse(await res.json()).data.map((p) => p.id)).toEqual([
        createdProduct.product.id,
      ]);
    });
  });

  test(
    'a search that matches nothing returns an empty page',
    { tag: '@negative' },
    async ({ productsClient }) => {
      await test.step('Search products for a word no product has', async () => {
        const res = await productsClient.search(searchToken());

        expect(res.status()).toBe(HTTP.OK);
        expect(ProductPageSchema.parse(await res.json())).toMatchObject({ data: [], total: 0 });
      });
    },
  );
});
