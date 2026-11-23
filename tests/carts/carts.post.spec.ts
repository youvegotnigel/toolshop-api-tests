import { test, expect } from '../../src/fixtures';
import { CartIdSchema, CartSchema } from '../../src/schemas/cart.schema';
import { HTTP } from '../../src/utils/http';

test.describe('POST /carts', { tag: ['@carts', '@post'] }, () => {
  test(
    'a shopper starts a new, empty cart',
    { tag: '@smoke', annotation: { type: 'covers', description: 'GET /carts/{id}' } },
    async ({ cartsClient, cleanup }) => {
      const id = await test.step('A shopper starts a cart', async () => {
        const res = await cartsClient.create();

        expect(res.status()).toBe(HTTP.CREATED);
        const cart = CartIdSchema.parse(await res.json());
        cleanup.add(`delete cart ${cart.id}`, () => cartsClient.remove(cart.id));
        return cart.id;
      });

      await test.step('The new cart has no items', async () => {
        const res = await cartsClient.get(id);

        expect(res.status()).toBe(HTTP.OK);
        expect(CartSchema.parse(await res.json())).toMatchObject({ id, cart_items: [] });
      });
    },
  );
});
