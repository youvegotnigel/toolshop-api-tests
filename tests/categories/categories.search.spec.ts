import { test, expect } from '../../src/fixtures';
import { CategoryTreeSchema } from '../../src/schemas/category.schema';
import { searchToken } from '../../src/data/test-data';
import { HTTP } from '../../src/utils/http';

test.describe('GET /categories/search', { tag: ['@categories', '@get'] }, () => {
  test('a shopper finds a category by a word in its name', async ({ categoriesClient, createdCategory }) => {
    const word = createdCategory.name.split(' ')[1] ?? '';

    await test.step('Search categories for a word that only this category has', async () => {
      const res = await categoriesClient.search(word);

      expect(res.status()).toBe(HTTP.OK);
      expect(CategoryTreeSchema.parse(await res.json())).toEqual([
        { ...createdCategory, sub_categories: [] },
      ]);
    });
  });

  test(
    'a search that matches nothing returns an empty list',
    { tag: '@negative' },
    async ({ categoriesClient }) => {
      await test.step('Search categories for a word no category has', async () => {
        const res = await categoriesClient.search(searchToken());

        expect(res.status()).toBe(HTTP.OK);
        expect(CategoryTreeSchema.parse(await res.json())).toEqual([]);
      });
    },
  );
});
