import { test, expect } from '../../src/fixtures';
import { MessageSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('DELETE /carts/{cartId}', { tag: ['@carts', '@delete'] }, () => {
  test('a deleted cart, items included, can no longer be opened', async ({
    cartsClient,
    createdProduct,
    createCart,
  }) => {
    const cartId = await createCart();

    await test.step('Put a product in the cart', async () => {
      await expect(
        await cartsClient.addItem(cartId, { product_id: createdProduct.product.id, quantity: 1 }),
      ).toBeOK();
    });

    await test.step('The shopper deletes the cart', async () => {
      expect((await cartsClient.remove(cartId)).status()).toBe(HTTP.NO_CONTENT);
    });

    await test.step('Opening the deleted cart returns not found', async () => {
      expect((await cartsClient.get(cartId)).status()).toBe(HTTP.NOT_FOUND);
    });
  });

  test(
    'deleting a cart that does not exist returns not found',
    { tag: '@negative' },
    async ({ cartsClient }) => {
      await test.step('Delete a cart id that was never created', async () => {
        const res = await cartsClient.remove('01NOTAREALCARTID0000000000');

        expect(res.status()).toBe(HTTP.NOT_FOUND);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Cart doesnt exists' });
      });
    },
  );
});
