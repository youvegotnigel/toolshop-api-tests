import { test, expect } from '../../src/fixtures';
import { buildProduct } from '../../src/data/product.builder';
import { ValidationErrorsSchema } from '../../src/schemas/common.schema';
import { ProductSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('POST /products', { tag: ['@products', '@post'] }, () => {
  test(
    'a new product is created with its brand, category and image',
    { tag: '@smoke' },
    async ({
      productsClient,
      adminProductsClient,
      createdBrand,
      createdCategory,
      productImageId,
      cleanup,
    }) => {
      const input = buildProduct({
        brand_id: createdBrand.id,
        category_id: createdCategory.id,
        product_image_id: productImageId,
      });

      await test.step('Create a product in the test brand and category', async () => {
        const res = await productsClient.create(input);

        expect(res.status()).toBe(HTTP.CREATED);
        const product = ProductSchema.parse(await res.json());
        cleanup.add(`delete product ${product.id}`, () => adminProductsClient.remove(product.id));
        expect(product).toMatchObject({ name: input.name, price: input.price, is_rental: false });
        expect(product.brand.id).toBe(createdBrand.id);
        expect(product.category.id).toBe(createdCategory.id);
        expect(product.product_image.id).toBe(productImageId);
      });
    },
  );

  for (const { reason, field, change } of [
    { reason: 'the name is missing', field: 'name', change: { name: undefined } },
    { reason: 'the price is not a number', field: 'price', change: { price: 'free' } },
    { reason: 'the brand is missing', field: 'brand_id', change: { brand_id: undefined } },
  ]) {
    test(
      `a product is rejected when ${reason}`,
      { tag: '@negative' },
      async ({ productsClient, createdBrand, createdCategory, productImageId }) => {
        const valid = buildProduct({
          brand_id: createdBrand.id,
          category_id: createdCategory.id,
          product_image_id: productImageId,
        });

        await test.step(`Try to create a product where ${reason}`, async () => {
          const res = await productsClient.createRaw({ ...valid, ...change });

          expect(res.status()).toBe(HTTP.UNPROCESSABLE);
          expect(Object.keys(ValidationErrorsSchema.parse(await res.json()))).toContain(field);
        });
      },
    );
  }
});
