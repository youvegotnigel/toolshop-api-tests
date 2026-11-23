import { test, expect } from '../../src/fixtures';
import { CartResultSchema, CartSchema } from '../../src/schemas/cart.schema';
import { LaravelValidationErrorSchema, MessageSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('POST /carts/{id}', { tag: ['@carts', '@post'] }, () => {
  test(
    'a shopper adds a product to the cart',
    { tag: '@smoke' },
    async ({ cartsClient, createdProduct, createCart }) => {
      const cartId = await createCart(); // after the product, so cleanup removes the cart first

      await test.step('Add two of the product to the cart', async () => {
        const res = await cartsClient.addItem(cartId, { product_id: createdProduct.product.id, quantity: 2 });

        expect(res.status()).toBe(HTTP.OK);
        expect(CartResultSchema.parse(await res.json())).toEqual({ result: 'item added or updated' });
      });

      await test.step('The cart holds two of that product at its price', async () => {
        const res = await cartsClient.get(cartId);

        expect(res.status()).toBe(HTTP.OK);
        const [line, ...rest] = CartSchema.parse(await res.json()).cart_items;
        expect(rest).toEqual([]);
        expect(line).toMatchObject({
          product_id: createdProduct.product.id,
          quantity: 2,
          product: { name: createdProduct.input.name, price: createdProduct.input.price },
        });
      });
    },
  );

  test('adding a product that is already in the cart adds to its quantity', async ({
    cartsClient,
    createdProduct,
    createCart,
  }) => {
    const cartId = await createCart();
    const product_id = createdProduct.product.id;

    await test.step('Add two, then three more of the same product', async () => {
      expect((await cartsClient.addItem(cartId, { product_id, quantity: 2 })).status()).toBe(HTTP.OK);
      expect((await cartsClient.addItem(cartId, { product_id, quantity: 3 })).status()).toBe(HTTP.OK);
    });

    await test.step('The cart has one line with five of them', async () => {
      const res = await cartsClient.get(cartId);

      expect(res.status()).toBe(HTTP.OK);
      expect(CartSchema.parse(await res.json()).cart_items.map((i) => i.quantity)).toEqual([5]);
    });
  });

  for (const { reason, field, line } of [
    {
      reason: 'the product does not exist',
      field: 'product_id',
      line: { product_id: '01NOTAREALPRODUCTID0000000', quantity: 1 },
    },
    { reason: 'the quantity is zero', field: 'quantity', line: { quantity: 0 } },
    { reason: 'the quantity is over 99', field: 'quantity', line: { quantity: 100 } },
  ]) {
    test(
      `adding is rejected when ${reason}`,
      { tag: '@negative' },
      async ({ cartsClient, createdProduct, createCart }) => {
        const cartId = await createCart();

        await test.step(`Try to add to the cart where ${reason}`, async () => {
          const res = await cartsClient.addItem(cartId, { product_id: createdProduct.product.id, ...line });

          expect(res.status()).toBe(HTTP.UNPROCESSABLE);
          expect(Object.keys(LaravelValidationErrorSchema.parse(await res.json()).errors)).toEqual([field]);
        });
      },
    );
  }

  test(
    'adding to a cart that does not exist returns not found',
    { tag: '@negative' },
    async ({ cartsClient, createdProduct }) => {
      await test.step('Add a product to a cart id that was never created', async () => {
        const res = await cartsClient.addItem('01NOTAREALCARTID0000000000', {
          product_id: createdProduct.product.id,
          quantity: 1,
        });

        expect(res.status()).toBe(HTTP.NOT_FOUND);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Cart not found' });
      });
    },
  );
});
