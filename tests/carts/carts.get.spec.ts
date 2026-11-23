import { test, expect } from '../../src/fixtures';
import { CartSchema } from '../../src/schemas/cart.schema';
import { MessageSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /carts/{id}', { tag: ['@carts', '@get'] }, () => {
  test('a shopper sees every product in their cart with its quantity', async ({
    cartsClient,
    createdProduct,
    createProduct,
    createCart,
  }) => {
    const second = await createProduct({ brand: createdProduct.brand, category: createdProduct.category });
    const cartId = await createCart();

    await test.step('Put one of the first product and four of the second in the cart', async () => {
      await expect(
        await cartsClient.addItem(cartId, { product_id: createdProduct.product.id, quantity: 1 }),
      ).toBeOK();
      await expect(
        await cartsClient.addItem(cartId, { product_id: second.product.id, quantity: 4 }),
      ).toBeOK();
    });

    await test.step('Open the cart', async () => {
      const res = await cartsClient.get(cartId);

      expect(res.status()).toBe(HTTP.OK);
      const lines = CartSchema.parse(await res.json()).cart_items.map((i) => [i.product_id, i.quantity]);
      expect(lines).toEqual(
        expect.arrayContaining([
          [createdProduct.product.id, 1],
          [second.product.id, 4],
        ]),
      );
      expect(lines).toHaveLength(2);
    });
  });

  test(
    'opening a cart that does not exist returns not found',
    { tag: '@negative' },
    async ({ cartsClient }) => {
      await test.step('Open a cart id that was never created', async () => {
        const res = await cartsClient.get('01NOTAREALCARTID0000000000');

        expect(res.status()).toBe(HTTP.NOT_FOUND);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Requested item not found' });
      });
    },
  );
});
