import { test, expect } from '../../src/fixtures';
import { buildBilling } from '../../src/data/invoice.builder';
import { MessageSchema, UpdateResultSchema } from '../../src/schemas/common.schema';
import { InvoiceDetailSchema } from '../../src/schemas/invoice.schema';
import { HTTP } from '../../src/utils/http';

test.describe('PATCH /invoices/{id}', { tag: ['@checkout', '@patch'] }, () => {
  test('a customer corrects the billing street of their order', async ({ placeOrder }) => {
    const { invoice, customer } = await placeOrder();
    const { billing_street } = buildBilling();

    await test.step('The customer changes only the billing street', async () => {
      const res = await customer.invoices.update(invoice.id, { billing_street });

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });

    await test.step('The invoice shows the new street and the same city', async () => {
      const res = await customer.invoices.get(invoice.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(InvoiceDetailSchema.parse(await res.json())).toMatchObject({
        billing_street,
        billing_city: invoice.billing_city,
      });
    });
  });

  test(
    'a customer cannot change another customer’s order',
    { tag: '@auth' },
    async ({ placeOrder, signedInCustomer, invoicesClientFor }) => {
      const { invoice } = await placeOrder();
      const otherCustomer = await invoicesClientFor(signedInCustomer.token.access_token);

      await test.step('Another customer tries to change the billing street and is told it is not found', async () => {
        const res = await otherCustomer.update(invoice.id, buildBilling());

        expect(res.status()).toBe(HTTP.NOT_FOUND);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Requested item not found' });
      });
    },
  );
});
