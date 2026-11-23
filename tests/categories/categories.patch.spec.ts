import { test, expect } from '../../src/fixtures';
import { buildCategory } from '../../src/data/category.builder';
import { CategoryNodeSchema } from '../../src/schemas/category.schema';
import { UpdateResultSchema, ValidationErrorsSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('PATCH /categories/{id}', { tag: ['@categories', '@patch'] }, () => {
  test('renaming a category changes only its name', async ({ categoriesClient, createdCategory }) => {
    const { name } = buildCategory();

    await test.step('Change just the category name', async () => {
      const res = await categoriesClient.update(createdCategory.id, { name });

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });

    await test.step('The name changed and the slug stayed the same', async () => {
      const res = await categoriesClient.getById(createdCategory.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(CategoryNodeSchema.parse(await res.json())).toEqual({
        ...createdCategory,
        name,
        sub_categories: [],
      });
    });
  });

  test(
    'taking a slug another category already uses is refused',
    { tag: '@negative' },
    async ({ categoriesClient, createdCategory, createCategory }) => {
      const other = await createCategory();

      await test.step('Try to give the category the slug of another category', async () => {
        const res = await categoriesClient.update(createdCategory.id, { slug: other.slug });

        expect(res.status()).toBe(HTTP.CONFLICT);
        expect(Object.keys(ValidationErrorsSchema.parse(await res.json()))).toEqual(['slug']);
      });
    },
  );
});
