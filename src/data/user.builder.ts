import { randomBytes } from 'node:crypto';
import { faker } from '@faker-js/faker';
import { testDataTag } from './brand.builder';
import type { UserRegistration } from '../schemas/user.schema';

/**
 * A throwaway customer for this run. Toolshop requires a strong password that is not in a known
 * data breach, so it is random every time and never leaves this process.
 */
export const buildCustomer = (): UserRegistration => ({
  first_name: faker.person.firstName().slice(0, 40),
  last_name: 'QA Automation',
  email: `${testDataTag()}.${faker.string.alphanumeric(8).toLowerCase()}@toolshop-tests.example`,
  password: `Qa!9${randomBytes(12).toString('base64url')}`,
  dob: '1990-01-01',
});
