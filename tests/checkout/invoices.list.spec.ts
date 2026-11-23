import { test, expect } from '../../src/fixtures';
import { InvoicePageSchema } from '../../src/schemas/invoice.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /invoices', { tag: ['@checkout', '@get'] }, () => {
  test('a customer’s order history shows their own orders only', async ({ placeOrder }) => {
    const { invoice, customer } = await placeOrder();
    await placeOrder(); // someone else's order, which must not show up

    await test.step('The customer opens their order history', async () => {
      const res = await customer.invoices.list();

      expect(res.status()).toBe(HTTP.OK);
      const page = InvoicePageSchema.parse(await res.json());
      expect(page.total).toBe(1);
      expect(page.data.map((i) => i.id)).toEqual([invoice.id]);
    });
  });
});
