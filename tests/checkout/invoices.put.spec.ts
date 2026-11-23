import { test, expect } from '../../src/fixtures';
import { buildBilling } from '../../src/data/invoice.builder';
import { UpdateResultSchema } from '../../src/schemas/common.schema';
import { InvoiceDetailSchema } from '../../src/schemas/invoice.schema';
import { HTTP } from '../../src/utils/http';

test.describe('PUT /invoices/{id}', { tag: ['@checkout', '@put'] }, () => {
  test('a customer replaces the billing address of their order', async ({ placeOrder }) => {
    const { invoice, checkout, customer } = await placeOrder();
    const billing = buildBilling({ billing_city: 'Utrecht', billing_state: 'Utrecht' });

    await test.step('The customer sends the order again with a new billing address', async () => {
      const res = await customer.invoices.replace(invoice.id, { ...checkout, ...billing });

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });

    await test.step('The invoice shows the new address and the same total', async () => {
      const res = await customer.invoices.get(invoice.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(InvoiceDetailSchema.parse(await res.json())).toMatchObject({ ...billing, total: invoice.total });
    });
  });
});
