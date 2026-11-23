import { faker } from '@faker-js/faker';
import { searchToken, testDataTag } from './test-data';
import { testEmail } from './user.builder';
import type { ContactInput } from '../schemas/message.schema';

/**
 * A contact message carrying the run tag. Messages cannot be deleted through the API: they stay until the
 * hourly database reset, so keep the content obviously test data.
 */
export const buildMessage = (overrides: Partial<ContactInput> = {}): ContactInput => ({
  name: `${testDataTag()} QA Automation`,
  email: testEmail(),
  subject: `${testDataTag()} ${searchToken()}`.slice(0, 120),
  message: `Automated test message, please ignore. ${faker.lorem.sentence()}`.slice(0, 250),
  ...overrides,
});
