import { test, expect } from '../../src/fixtures';
import { MessageSchema, ValidationErrorsSchema } from '../../src/schemas/common.schema';
import { FavoriteListSchema, FavoriteSchema } from '../../src/schemas/favorite.schema';
import { HTTP } from '../../src/utils/http';

test.describe('POST /favorites', { tag: ['@favorites', '@post'] }, () => {
  test(
    'a customer saves a product to their favorites',
    { annotation: { type: 'covers', description: 'GET /favorites' } },
    async ({ customerFavoritesClient, createdProduct, cleanup }) => {
      const favorite = await test.step('The customer favorites the product', async () => {
        const res = await customerFavoritesClient.add(createdProduct.product.id);

        expect(res.status()).toBe(HTTP.CREATED);
        const saved = FavoriteSchema.parse(await res.json());
        cleanup.add(`delete favorite ${saved.id}`, () => customerFavoritesClient.remove(saved.id));
        expect(saved.product_id).toBe(createdProduct.product.id);
        return saved;
      });

      await test.step('The product shows up in the customer’s favorites with its name', async () => {
        const res = await customerFavoritesClient.list();

        expect(res.status()).toBe(HTTP.OK);
        const mine = FavoriteListSchema.parse(await res.json()).find((f) => f.id === favorite.id);
        expect(mine?.product.name).toBe(createdProduct.input.name);
      });
    },
  );

  test(
    'a product that does not exist cannot be favorited',
    { tag: '@negative' },
    async ({ customerFavoritesClient }) => {
      await test.step('The customer favorites a product id that was never created', async () => {
        const res = await customerFavoritesClient.add('01NOTAREALPRODUCTID0000000');

        expect(res.status()).toBe(HTTP.UNPROCESSABLE);
        expect(Object.keys(ValidationErrorsSchema.parse(await res.json()))).toEqual(['product_id']);
      });
    },
  );

  test(
    'a shopper who is not logged in has no favorites',
    { tag: '@auth' },
    async ({ favoritesClient, createdProduct }) => {
      await test.step('An anonymous shopper tries to favorite a product and is refused', async () => {
        const res = await favoritesClient.add(createdProduct.product.id);

        expect(res.status()).toBe(HTTP.UNAUTHORIZED);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Unauthorized' });
      });
    },
  );
});
