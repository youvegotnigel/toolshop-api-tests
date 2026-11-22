import { test, expect } from '../../src/fixtures';
import { buildBrand } from '../../src/data/brand.builder';
import { BrandSchema } from '../../src/schemas/brand.schema';
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
});
