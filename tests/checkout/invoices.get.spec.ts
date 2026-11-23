import { test, expect } from '../../src/fixtures';
import { MessageSchema } from '../../src/schemas/common.schema';
import { InvoiceDetailSchema } from '../../src/schemas/invoice.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /invoices/{id}', { tag: ['@checkout', '@get'] }, () => {
  test('an admin can open any customer’s invoice', async ({ placeOrder, adminInvoicesClient }) => {
    const { invoice } = await placeOrder();

    await test.step('An admin opens the customer’s invoice', async () => {
      const res = await adminInvoicesClient.get(invoice.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(InvoiceDetailSchema.parse(await res.json())).toMatchObject({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
      });
    });
  });

  test(
    'a customer cannot open another customer’s invoice',
    { tag: '@auth' },
    async ({ placeOrder, signedInCustomer, invoicesClientFor }) => {
      const { invoice } = await placeOrder();
      const otherCustomer = await invoicesClientFor(signedInCustomer.token.access_token);

      await test.step('Another customer opens the invoice and is told it is not found', async () => {
        const res = await otherCustomer.get(invoice.id);

        expect(res.status()).toBe(HTTP.NOT_FOUND);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Requested item not found' });
      });
    },
  );
});
