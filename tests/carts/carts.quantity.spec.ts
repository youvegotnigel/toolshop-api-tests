import { test, expect } from '../../src/fixtures';
import { CartResultSchema, CartSchema } from '../../src/schemas/cart.schema';
import { LaravelValidationErrorSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('PUT /carts/{cartId}/product/quantity', { tag: ['@carts', '@put'] }, () => {
  test('changing the quantity replaces it instead of adding to it', async ({
    cartsClient,
    createdProduct,
    createCart,
  }) => {
    const cartId = await createCart();
    const product_id = createdProduct.product.id;

    await test.step('Put three of the product in the cart', async () => {
      await expect(await cartsClient.addItem(cartId, { product_id, quantity: 3 })).toBeOK();
    });

    await test.step('The shopper sets the quantity to seven', async () => {
      const res = await cartsClient.setQuantity(cartId, { product_id, quantity: 7 });

      expect(res.status()).toBe(HTTP.OK);
      expect(CartResultSchema.parse(await res.json())).toEqual({ result: 'item added or updated' });
    });

    await test.step('The cart now holds exactly seven', async () => {
      const res = await cartsClient.get(cartId);

      expect(res.status()).toBe(HTTP.OK);
      expect(CartSchema.parse(await res.json()).cart_items.map((i) => i.quantity)).toEqual([7]);
    });
  });

  test(
    'a quantity over 99 is rejected',
    { tag: '@negative' },
    async ({ cartsClient, createdProduct, createCart }) => {
      const cartId = await createCart();
      const product_id = createdProduct.product.id;

      await test.step('Put the product in the cart', async () => {
        await expect(await cartsClient.addItem(cartId, { product_id, quantity: 1 })).toBeOK();
      });

      await test.step('The shopper tries to set the quantity to 100', async () => {
        const res = await cartsClient.setQuantity(cartId, { product_id, quantity: 100 });

        expect(res.status()).toBe(HTTP.UNPROCESSABLE);
        expect(Object.keys(LaravelValidationErrorSchema.parse(await res.json()).errors)).toEqual([
          'quantity',
        ]);
      });
    },
  );
});
