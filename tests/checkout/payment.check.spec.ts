import { test, expect } from '../../src/fixtures';
import { validPayments } from '../../src/data/invoice.builder';
import { LaravelValidationErrorSchema } from '../../src/schemas/common.schema';
import { PaymentResultSchema } from '../../src/schemas/invoice.schema';
import { HTTP } from '../../src/utils/http';

const card = (details: Record<string, string>) => ({
  payment_method: 'credit-card',
  payment_details: {
    credit_card_number: '0000-0000-0000-0000',
    expiration_date: `12/${String(new Date().getFullYear() + 1)}`,
    cvv: '123',
    card_holder_name: 'QA Automation',
    ...details,
  },
});

test.describe('POST /payment/check', { tag: ['@checkout', '@post'] }, () => {
  for (const { label, ...payment } of validPayments()) {
    test(`valid ${label} details are accepted`, { tag: '@smoke' }, async ({ paymentClient }) => {
      await test.step(`A shopper pays by ${label}`, async () => {
        const res = await paymentClient.check(payment);

        expect(res.status()).toBe(HTTP.OK);
        expect(PaymentResultSchema.parse(await res.json())).toEqual({ message: 'Payment was successful' });
      });
    });
  }

  for (const { reason, field, details } of [
    {
      reason: 'the card number is not in 0000-0000-0000-0000 form',
      field: 'credit_card_number',
      details: { credit_card_number: '0000000000000000' },
    },
    { reason: 'the card has expired', field: 'expiration_date', details: { expiration_date: '01/2020' } },
    { reason: 'the CVV has letters', field: 'cvv', details: { cvv: '12a' } },
  ]) {
    test(`a card payment is rejected when ${reason}`, { tag: '@negative' }, async ({ paymentClient }) => {
      await test.step(`A shopper pays by card where ${reason}`, async () => {
        const res = await paymentClient.check(card(details));

        expect(res.status()).toBe(HTTP.UNPROCESSABLE);
        expect(Object.keys(LaravelValidationErrorSchema.parse(await res.json()).errors)).toEqual([
          `payment_details.${field}`,
        ]);
      });
    });
  }
});
