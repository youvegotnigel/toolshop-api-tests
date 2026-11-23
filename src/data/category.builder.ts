import { faker } from '@faker-js/faker';
import { searchToken, testDataTag } from './test-data';
import type { CategoryInput } from '../schemas/category.schema';

export const buildCategory = (overrides: Partial<CategoryInput> = {}): CategoryInput => ({
  name: `${testDataTag()} ${searchToken()} ${faker.commerce.department()}`.slice(0, 120),
  slug: `${testDataTag()}-${faker.string.alphanumeric(8).toLowerCase()}`,
  parent_id: null,
  ...overrides,
});
