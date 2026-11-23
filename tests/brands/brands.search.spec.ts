import { test, expect } from '../../src/fixtures';
import { BrandListSchema } from '../../src/schemas/brand.schema';
import { searchToken } from '../../src/data/test-data';
import { HTTP } from '../../src/utils/http';

test.describe('GET /brands/search', { tag: ['@brands', '@get'] }, () => {
  test('a shopper finds a brand by a word in its name', async ({ brandsClient, createdBrand }) => {
    const word = createdBrand.name.split(' ')[1] ?? '';

    await test.step('Search brands for a word that only this brand has', async () => {
      const res = await brandsClient.search(word);

      expect(res.status()).toBe(HTTP.OK);
      expect(BrandListSchema.parse(await res.json())).toEqual([createdBrand]);
    });
  });

  test(
    'a search that matches nothing returns an empty list',
    { tag: '@negative' },
    async ({ brandsClient }) => {
      await test.step('Search brands for a word no brand has', async () => {
        const res = await brandsClient.search(searchToken());

        expect(res.status()).toBe(HTTP.OK);
        expect(BrandListSchema.parse(await res.json())).toEqual([]);
      });
    },
  );
});
