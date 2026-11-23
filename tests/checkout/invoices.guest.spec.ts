import { test, expect } from '../../src/fixtures';
import { buildGuestCheckout } from '../../src/data/invoice.builder';
import { LaravelValidationErrorSchema } from '../../src/schemas/common.schema';
import { InvoiceSchema } from '../../src/schemas/invoice.schema';
import { HTTP } from '../../src/utils/http';

test.describe('POST /invoices/guest', { tag: ['@checkout', '@post'] }, () => {
  test('a shopper without an account checks out as a guest', async ({
    invoicesClient,
    cartsClient,
    createdProduct,
    createCart,
    cleanup,
  }) => {
    const cartId = await createCart();

    await test.step('Put the product in the cart', async () => {
      await expect(
        await cartsClient.addItem(cartId, { product_id: createdProduct.product.id, quantity: 1 }),
      ).toBeOK();
    });

    await test.step('Check out as a guest with name and email', async () => {
      const res = await invoicesClient.createGuest(buildGuestCheckout(cartId));

      expect(res.status()).toBe(HTTP.CREATED);
      const invoice = InvoiceSchema.parse(await res.json());
      cleanup.expectRefusal(
        [createdProduct.product.id, createdProduct.brand.id, createdProduct.category.id],
        `referenced by guest invoice ${invoice.invoice_number}; removed by the hourly reset`,
      );
      expect(invoice.total).toBeCloseTo(createdProduct.input.price, 2);
    });
  });

  test(
    'a guest checkout without an email is rejected',
    { tag: '@negative' },
    async ({ invoicesClient, createCart }) => {
      const cartId = await createCart();

      await test.step('Check out as a guest without an email address', async () => {
        const res = await invoicesClient.createGuest({ ...buildGuestCheckout(cartId), guest_email: '' });

        expect(res.status()).toBe(HTTP.UNPROCESSABLE);
        expect(Object.keys(LaravelValidationErrorSchema.parse(await res.json()).errors)).toEqual([
          'guest_email',
        ]);
      });
    },
  );
});
