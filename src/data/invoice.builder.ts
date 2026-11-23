import { faker } from '@faker-js/faker';
import { searchToken, testDataTag } from './test-data';
import { testEmail } from './user.builder';
import type { Billing, CheckoutInput, GuestCheckoutInput, PaymentCheck } from '../schemas/invoice.schema';

/**
 * Billing address with the run tag and a searchable word in the street (invoice search matches the street).
 * No postal code on purpose: with one, the API checks it against an external postcode service.
 */
export const buildBilling = (overrides: Partial<Billing> = {}): Billing => ({
  billing_street: `${testDataTag()} ${searchToken()} ${faker.location.street()}`.slice(0, 70),
  billing_city: 'Amsterdam',
  billing_state: 'Noord-Holland',
  billing_country: 'The Netherlands',
  ...overrides,
});

/** Cash on delivery: no payment details are stored, so no card-like data ever reaches the shared database. */
export const buildCheckout = (cartId: string, overrides: Partial<CheckoutInput> = {}): CheckoutInput => ({
  ...buildBilling(),
  cart_id: cartId,
  payment_method: 'cash-on-delivery',
  payment_details: {},
  ...overrides,
});

export const buildGuestCheckout = (cartId: string): GuestCheckoutInput => ({
  ...buildCheckout(cartId),
  guest_email: testEmail(),
  guest_first_name: faker.person.firstName(),
  guest_last_name: 'QA Automation',
});

const nextYear = (): string => `12/${String(new Date().getFullYear() + 1)}`;

/** Valid details per method. Card data is format-only test data, never a real card number. */
export const validPayments = (): (PaymentCheck & { label: string })[] => [
  { label: 'cash on delivery', payment_method: 'cash-on-delivery', payment_details: {} },
  {
    label: 'bank transfer',
    payment_method: 'bank-transfer',
    payment_details: { bank_name: 'Test Bank', account_name: 'QA Automation', account_number: '123456789' },
  },
  {
    label: 'credit card',
    payment_method: 'credit-card',
    payment_details: {
      credit_card_number: '0000-0000-0000-0000',
      expiration_date: nextYear(),
      cvv: '123',
      card_holder_name: 'QA Automation',
    },
  },
  {
    label: 'buy now, pay later',
    payment_method: 'buy-now-pay-later',
    payment_details: { monthly_installments: 3 },
  },
];
