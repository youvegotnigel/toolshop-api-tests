import { test, expect } from '../../src/fixtures';
import { FavoriteListSchema } from '../../src/schemas/favorite.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /favorites', { tag: ['@favorites', '@get'] }, () => {
  test(
    'a customer only sees their own favorites',
    { tag: '@auth' },
    async ({ createdProduct, createFavorite, signedInCustomer, favoritesClientFor }) => {
      await createFavorite(createdProduct.product.id);
      const otherCustomer = await favoritesClientFor(signedInCustomer.token.access_token);

      await test.step('Another customer, who saved nothing, opens their favorites and sees none', async () => {
        const res = await otherCustomer.list();

        expect(res.status()).toBe(HTTP.OK);
        expect(FavoriteListSchema.parse(await res.json())).toEqual([]);
      });
    },
  );
});
