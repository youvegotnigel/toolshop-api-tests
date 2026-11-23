import { test, expect } from '../../src/fixtures';
import { LaravelValidationErrorSchema, UpdateResultSchema } from '../../src/schemas/common.schema';
import { InvoiceDetailSchema } from '../../src/schemas/invoice.schema';
import { HTTP } from '../../src/utils/http';
import { knownBug } from '../../src/utils/known-bug';

test.describe('PUT /invoices/{invoiceId}/status', { tag: ['@checkout', '@put'] }, () => {
  test('an admin ships an order and the customer sees it', async ({ placeOrder, adminInvoicesClient }) => {
    const { invoice, customer } = await placeOrder();

    await test.step('An admin marks the order as shipped with a note', async () => {
      const res = await adminInvoicesClient.setStatus(invoice.id, 'SHIPPED', 'Left the warehouse');

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });

    await test.step('The customer sees the order as shipped with the note', async () => {
      const res = await customer.invoices.get(invoice.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(InvoiceDetailSchema.parse(await res.json())).toMatchObject({
        status: 'SHIPPED',
        status_message: 'Left the warehouse',
      });
    });
  });

  test(
    'a status that does not exist is rejected',
    { tag: '@negative' },
    async ({ placeOrder, adminInvoicesClient }) => {
      const { invoice } = await placeOrder();

      await test.step('An admin tries to set the status to LOST', async () => {
        const res = await adminInvoicesClient.setStatus(invoice.id, 'LOST');

        expect(res.status()).toBe(HTTP.UNPROCESSABLE);
        expect(Object.keys(LaravelValidationErrorSchema.parse(await res.json()).errors)).toEqual(['status']);
      });
    },
  );

  test.fail(
    'another customer cannot change the status of my order',
    knownBug(19, 'Any customer can change the status of any invoice (no ownership check)', ['@auth']),
    async ({ placeOrder, signedInCustomer, invoicesClientFor }) => {
      const { invoice, customer } = await placeOrder();
      const otherCustomer = await invoicesClientFor(signedInCustomer.token.access_token);

      await test.step('Another customer tries to mark my order as completed and is refused', async () => {
        const res = await otherCustomer.setStatus(invoice.id, 'COMPLETED');

        expect([HTTP.FORBIDDEN, HTTP.NOT_FOUND]).toContain(res.status());
      });

      await test.step('My order still has its original status', async () => {
        const res = await customer.invoices.get(invoice.id);

        expect(res.status()).toBe(HTTP.OK);
        expect(InvoiceDetailSchema.parse(await res.json()).status).toBe('AWAITING_FULFILLMENT');
      });
    },
  );
});
