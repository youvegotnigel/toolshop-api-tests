import { faker } from '@faker-js/faker';
import { runId } from '../config/env';
import type { BrandInput } from '../schemas/brand.schema';

/** Every brand this framework creates carries the run id, so the teardown sweep can find leftovers. */
export const testDataTag = (): string => `qa-${runId()}`;

export const buildBrand = (overrides: Partial<BrandInput> = {}): BrandInput => {
  const suffix = faker.string.alphanumeric(8).toLowerCase();
  return {
    name: `${testDataTag()} ${faker.company.name()}`.slice(0, 120),
    slug: `${testDataTag()}-${suffix}`,
    ...overrides,
  };
};
