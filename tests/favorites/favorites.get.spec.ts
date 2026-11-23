import { test, expect } from '../../src/fixtures';
import { FavoriteSchema } from '../../src/schemas/favorite.schema';
import { HTTP } from '../../src/utils/http';
import { knownBug } from '../../src/utils/known-bug';

test.describe('GET /favorites/{id}', { tag: ['@favorites', '@get'] }, () => {
  test('a customer opens one of their favorites', async ({
    customerFavoritesClient,
    createdProduct,
    createFavorite,
  }) => {
    const favorite = await createFavorite(createdProduct.product.id);

    await test.step('The customer opens the favorite by its id', async () => {
      const res = await customerFavoritesClient.get(favorite.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(FavoriteSchema.parse(await res.json())).toEqual(favorite);
    });
  });

  test.fail(
    'another customer cannot open my favorite',
    knownBug(21, 'Any customer can read any customer’s favorite (no ownership check)', ['@auth']),
    async ({ createdProduct, createFavorite, signedInCustomer, favoritesClientFor }) => {
      const favorite = await createFavorite(createdProduct.product.id);
      const otherCustomer = await favoritesClientFor(signedInCustomer.token.access_token);

      await test.step('Another customer opens my favorite and is told it is not found', async () => {
        expect((await otherCustomer.get(favorite.id)).status()).toBe(HTTP.NOT_FOUND);
      });
    },
  );
});
