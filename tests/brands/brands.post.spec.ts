import { test, expect } from '../../src/fixtures';
import { buildBrand } from '../../src/data/brand.builder';
import { invalidBrands } from '../../src/data/invalid-brands';
import { BrandSchema, ValidationErrorsSchema } from '../../src/schemas/brand.schema';
import { HTTP } from '../../src/utils/http';

test.describe('POST /brands', { tag: ['@brands', '@post'] }, () => {
  test(
    'a new brand is created and matches the API contract',
    { tag: '@smoke' },
    async ({ brandsClient, adminBrandsClient, cleanup }) => {
      const newBrand = buildBrand();

      const created = await test.step('Create a brand with a unique name and slug', async () => {
        const res = await brandsClient.create(newBrand);

        expect(res.status()).toBe(HTTP.CREATED);
        const brand = BrandSchema.parse(await res.json());
        cleanup.add(`delete brand ${brand.id}`, () => adminBrandsClient.remove(brand.id));
        return brand;
      });

      await test.step('Check the response echoes exactly what was sent', () => {
        expect(created).toMatchObject(newBrand);
      });

      await test.step('Confirm the brand can be read back', async () => {
        const res = await brandsClient.getById(created.id);

        expect(res.status()).toBe(HTTP.OK);
        expect(await res.json()).toEqual(created);
      });
    },
  );

  // Data-driven: one definition, one reported test per invalid body
  for (const { reason, field, body } of invalidBrands()) {
    test(`a brand is rejected when ${reason}`, { tag: '@negative' }, async ({ brandsClient }) => {
      await test.step(`Try to create a brand where ${reason}`, async () => {
        const res = await brandsClient.createRaw(body);

        expect(res.status()).toBe(HTTP.UNPROCESSABLE);
        expect(Object.keys(ValidationErrorsSchema.parse(await res.json()))).toContain(field);
      });
    });
  }

  test(
    'a second brand with the same slug is refused',
    { tag: '@negative' },
    async ({ brandsClient, createdBrand }) => {
      await test.step('Try to create another brand reusing an existing slug', async () => {
        const res = await brandsClient.createRaw(buildBrand({ slug: createdBrand.slug }));

        expect(res.status()).toBe(HTTP.CONFLICT);
        expect(ValidationErrorsSchema.parse(await res.json())).toEqual({
          slug: ['A brand already exists with this slug.'],
        });
      });

      await test.step('The original brand is unchanged', async () => {
        const res = await brandsClient.getById(createdBrand.id);

        expect(res.status()).toBe(HTTP.OK);
        expect(await res.json()).toEqual(createdBrand);
      });
    },
  );
});
