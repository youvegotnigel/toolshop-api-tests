import { test, expect } from '../../src/fixtures';
import { FavoriteListSchema } from '../../src/schemas/favorite.schema';
import { HTTP } from '../../src/utils/http';

test.describe('DELETE /favorites/{id}', { tag: ['@favorites', '@delete'] }, () => {
  test('a customer removes a favorite', async ({
    customerFavoritesClient,
    createdProduct,
    createFavorite,
  }) => {
    const favorite = await createFavorite(createdProduct.product.id);

    await test.step('The customer removes the favorite', async () => {
      expect((await customerFavoritesClient.remove(favorite.id)).status()).toBe(HTTP.NO_CONTENT);
    });

    await test.step('It is no longer in their favorites', async () => {
      const res = await customerFavoritesClient.list();

      expect(res.status()).toBe(HTTP.OK);
      expect(FavoriteListSchema.parse(await res.json()).map((f) => f.id)).not.toContain(favorite.id);
    });
  });

  test(
    'another customer cannot remove my favorite',
    { tag: '@auth' },
    async ({
      customerFavoritesClient,
      createdProduct,
      createFavorite,
      signedInCustomer,
      favoritesClientFor,
    }) => {
      const favorite = await createFavorite(createdProduct.product.id);
      const otherCustomer = await favoritesClientFor(signedInCustomer.token.access_token);

      await test.step('Another customer tries to remove my favorite (the API answers 204 either way)', async () => {
        expect((await otherCustomer.remove(favorite.id)).status()).toBe(HTTP.NO_CONTENT);
      });

      await test.step('My favorite is still there', async () => {
        const res = await customerFavoritesClient.list();

        expect(res.status()).toBe(HTTP.OK);
        expect(FavoriteListSchema.parse(await res.json()).map((f) => f.id)).toContain(favorite.id);
      });
    },
  );
});
