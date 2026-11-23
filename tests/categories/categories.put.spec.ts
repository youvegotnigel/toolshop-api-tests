import { test, expect } from '../../src/fixtures';
import { buildCategory } from '../../src/data/category.builder';
import { CategoryNodeSchema } from '../../src/schemas/category.schema';
import { UpdateResultSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('PUT /categories/{id}', { tag: ['@categories', '@put'] }, () => {
  test('replacing a category updates its name and slug', async ({ categoriesClient, createdCategory }) => {
    const replacement = buildCategory();

    await test.step('Replace the whole category with new details', async () => {
      const res = await categoriesClient.replace(createdCategory.id, replacement);

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });

    await test.step('Read the category back and see the new details', async () => {
      const res = await categoriesClient.getById(createdCategory.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(CategoryNodeSchema.parse(await res.json())).toEqual({
        id: createdCategory.id,
        ...replacement,
        sub_categories: [],
      });
    });
  });
});
