import { randomBytes } from 'node:crypto';
import { faker } from '@faker-js/faker';
import { testDataTag } from './test-data';
import type { UserProfile, UserRegistration } from '../schemas/user.schema';

/** Emails start with the run tag, so the teardown sweep can find leftovers. */
export const testEmail = (): string =>
  `${testDataTag()}.${faker.string.alphanumeric(8).toLowerCase()}@toolshop-tests.example`;

/**
 * A throwaway customer for this run. Toolshop requires a strong password that is not in a known
 * data breach, so it is random every time and never leaves this process.
 */
export const buildCustomer = (overrides: Partial<UserRegistration> = {}): UserRegistration => ({
  first_name: faker.person.firstName().slice(0, 40),
  last_name: 'QA Automation',
  email: testEmail(),
  password: `Qa!9${randomBytes(12).toString('base64url')}`,
  dob: '1990-01-01',
  ...overrides,
});

/** A complete profile for PUT /users/{id}; keeps the customer's email so the sweep can still find them. */
export const buildProfile = (email: string, overrides: Partial<UserProfile> = {}): UserProfile => ({
  first_name: faker.person.firstName().slice(0, 40),
  last_name: faker.person.lastName().slice(0, 20),
  email,
  phone: '+31 20 123 4567',
  dob: '1985-06-15',
  address: {
    street: faker.location.street().slice(0, 70),
    house_number: '12',
    city: faker.location.city().slice(0, 40),
    state: 'Noord-Holland',
    country: 'The Netherlands',
    postal_code: '1011 AB',
  },
  ...overrides,
});
