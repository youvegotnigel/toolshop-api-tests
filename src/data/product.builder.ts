import { faker } from '@faker-js/faker';
import { searchToken, testDataTag } from './test-data';
import type { ProductInput, ProductSpecInput } from '../schemas/product.schema';

type Links = Pick<ProductInput, 'brand_id' | 'category_id' | 'product_image_id'>;

/** A product needs a brand, a category and an image: pass the ids, never seeded brand or category ids. */
export const buildProduct = (links: Links, overrides: Partial<ProductInput> = {}): ProductInput => ({
  name: `${testDataTag()} ${searchToken()} ${faker.commerce.productName()}`.slice(0, 120),
  description: `Created by automated tests (${testDataTag()}). ${faker.commerce.productDescription()}`.slice(
    0,
    1250,
  ),
  price: Number(faker.commerce.price({ min: 1, max: 500, dec: 2 })),
  is_location_offer: false,
  is_rental: false,
  ...links,
  ...overrides,
});

/** Spec names start with a unique word so GET /product-specs/names can be checked for this one. */
export const buildProductSpec = (overrides: Partial<ProductSpecInput> = {}): ProductSpecInput => ({
  spec_name: `${searchToken()} weight`,
  spec_value: String(faker.number.int({ min: 1, max: 999 })),
  spec_unit: 'g',
  ...overrides,
});
