import { test, expect } from '../../src/fixtures';
import { buildCheckout } from '../../src/data/invoice.builder';
import { MessageSchema, ValidationErrorsSchema } from '../../src/schemas/common.schema';
import { InvoiceDetailSchema } from '../../src/schemas/invoice.schema';
import { HTTP } from '../../src/utils/http';

test.describe('POST /invoices', { tag: ['@checkout', '@post'] }, () => {
  test(
    'a customer checks out their cart and gets an invoice with the right total',
    { tag: '@smoke', annotation: { type: 'covers', description: 'GET /invoices/{id}' } },
    async ({ placeOrder }) => {
      const { invoice, checkout, customer, bought, quantity } =
        await test.step('A customer buys two of a product with cash on delivery', async () => placeOrder());

      await test.step('The invoice has a number and charges price times quantity', () => {
        expect(invoice.invoice_number).toMatch(/^INV-\d{4}/);
        expect(invoice.total).toBeCloseTo(bought.input.price * quantity, 2);
        expect(invoice).toMatchObject({
          billing_street: checkout.billing_street,
          billing_city: checkout.billing_city,
        });
      });

      await test.step('The customer opens the invoice and sees the line, payment and first status', async () => {
        const res = await customer.invoices.get(invoice.id);

        expect(res.status()).toBe(HTTP.OK);
        const detail = InvoiceDetailSchema.parse(await res.json());
        expect(detail.status).toBe('AWAITING_FULFILLMENT');
        expect(detail.payment.payment_method).toBe('cash-on-delivery');
        expect(detail.invoicelines.map((l) => [l.product_id, l.quantity, l.unit_price])).toEqual([
          [bought.product.id, quantity, bought.input.price],
        ]);
      });
    },
  );

  test(
    'a checkout without a billing city is rejected',
    { tag: '@negative' },
    async ({ signedInCustomer, invoicesClientFor, createCart }) => {
      const invoices = await invoicesClientFor(signedInCustomer.token.access_token);
      const cartId = await createCart();

      await test.step('The customer checks out without a billing city', async () => {
        const withoutCity = Object.entries(buildCheckout(cartId)).filter(
          ([field]) => field !== 'billing_city',
        );
        const res = await invoices.create(Object.fromEntries(withoutCity));

        expect(res.status()).toBe(HTTP.UNPROCESSABLE);
        expect(Object.keys(ValidationErrorsSchema.parse(await res.json()))).toEqual(['billing_city']);
      });
    },
  );

  test(
    'a shopper who is not logged in must use guest checkout',
    { tag: '@auth' },
    async ({ invoicesClient, createCart }) => {
      const cartId = await createCart();

      await test.step('An anonymous shopper tries the customer checkout and is refused', async () => {
        const res = await invoicesClient.create(buildCheckout(cartId));

        expect(res.status()).toBe(HTTP.UNAUTHORIZED);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Unauthorized' });
      });
    },
  );
});
