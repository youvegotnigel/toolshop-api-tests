import { test, expect } from '../../src/fixtures';
import { CartSchema } from '../../src/schemas/cart.schema';
import { HTTP } from '../../src/utils/http';

test.describe('DELETE /carts/{cartId}/product/{productId}', { tag: ['@carts', '@delete'] }, () => {
  test('removing one product leaves the rest of the cart alone', async ({
    cartsClient,
    createdProduct,
    createProduct,
    createCart,
  }) => {
    const kept = await createProduct({ brand: createdProduct.brand, category: createdProduct.category });
    const cartId = await createCart();

    await test.step('Put two different products in the cart', async () => {
      await expect(
        await cartsClient.addItem(cartId, { product_id: createdProduct.product.id, quantity: 1 }),
      ).toBeOK();
      await expect(await cartsClient.addItem(cartId, { product_id: kept.product.id, quantity: 2 })).toBeOK();
    });

    await test.step('The shopper removes one product from the cart', async () => {
      expect((await cartsClient.removeItem(cartId, createdProduct.product.id)).status()).toBe(
        HTTP.NO_CONTENT,
      );
    });

    await test.step('Only the other product is left', async () => {
      const res = await cartsClient.get(cartId);

      expect(res.status()).toBe(HTTP.OK);
      expect(CartSchema.parse(await res.json()).cart_items.map((i) => i.product_id)).toEqual([
        kept.product.id,
      ]);
    });
  });
});
