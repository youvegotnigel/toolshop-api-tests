import { faker } from '@faker-js/faker';
import { searchToken, testDataTag } from './test-data';
import type { BrandInput } from '../schemas/brand.schema';

/** Name: run tag, a searchable word, then a readable company name. */
export const buildBrand = (overrides: Partial<BrandInput> = {}): BrandInput => ({
  name: `${testDataTag()} ${searchToken()} ${faker.company.name()}`.slice(0, 120),
  slug: `${testDataTag()}-${faker.string.alphanumeric(8).toLowerCase()}`,
  ...overrides,
});
