import { test, expect } from '../../src/fixtures';
import { BrandListSchema, BrandSchema } from '../../src/schemas/brand.schema';
import { MessageSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /brands/{id}', { tag: ['@brands', '@get'] }, () => {
  test(
    'a shopper can open a brand and find it in the brand list',
    { tag: '@smoke', annotation: { type: 'covers', description: 'GET /brands' } },
    async ({ brandsClient, createdBrand }) => {
      await test.step('Open the brand by its id', async () => {
        const res = await brandsClient.getById(createdBrand.id);

        expect(res.status()).toBe(HTTP.OK);
        expect(BrandSchema.parse(await res.json())).toEqual(createdBrand);
      });

      await test.step('Find the brand in the full brand list', async () => {
        const res = await brandsClient.list();

        expect(res.status()).toBe(HTTP.OK);
        expect(BrandListSchema.parse(await res.json())).toContainEqual(createdBrand);
      });
    },
  );

  test(
    'opening a brand that does not exist returns not found',
    { tag: '@negative' },
    async ({ brandsClient }) => {
      await test.step('Open a brand with an id that was never created', async () => {
        const res = await brandsClient.getById('01NOTAREALBRANDID000000000');

        expect(res.status()).toBe(HTTP.NOT_FOUND);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Requested item not found' });
      });
    },
  );
});
