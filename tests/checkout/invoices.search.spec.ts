import { test, expect } from '../../src/fixtures';
import { InvoicePageSchema } from '../../src/schemas/invoice.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /invoices/search', { tag: ['@checkout', '@get'] }, () => {
  test('a customer finds their order by a word in the billing street', async ({ placeOrder }) => {
    const { invoice, checkout, customer } = await placeOrder();
    const word = checkout.billing_street.split(' ')[1] ?? '';

    await test.step('The customer searches their orders for the word', async () => {
      const res = await customer.invoices.search(word);

      expect(res.status()).toBe(HTTP.OK);
      expect(InvoicePageSchema.parse(await res.json()).data.map((i) => i.id)).toEqual([invoice.id]);
    });
  });

  test(
    'a customer cannot find another customer’s order',
    { tag: '@auth' },
    async ({ placeOrder, signedInCustomer, invoicesClientFor }) => {
      const { checkout } = await placeOrder();
      const otherCustomer = await invoicesClientFor(signedInCustomer.token.access_token);

      await test.step('Another customer searches for the same word and finds nothing', async () => {
        const res = await otherCustomer.search(checkout.billing_street.split(' ')[1] ?? '');

        expect(res.status()).toBe(HTTP.OK);
        expect(InvoicePageSchema.parse(await res.json())).toMatchObject({ data: [], total: 0 });
      });
    },
  );
});
