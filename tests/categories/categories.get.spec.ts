import { test, expect } from '../../src/fixtures';
import { CategoryListSchema, CategoryNodeSchema } from '../../src/schemas/category.schema';
import { MessageSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /categories/tree/{id}', { tag: ['@categories', '@get'] }, () => {
  test(
    'a shopper opens a category with its subcategories and finds it in the category list',
    { tag: '@smoke', annotation: { type: 'covers', description: 'GET /categories' } },
    async ({ categoriesClient, createdCategory, createCategory }) => {
      const child = await createCategory({ parent_id: createdCategory.id });

      await test.step('Open the category by its id and see its subcategory', async () => {
        const res = await categoriesClient.getById(createdCategory.id);

        expect(res.status()).toBe(HTTP.OK);
        expect(CategoryNodeSchema.parse(await res.json())).toEqual({
          ...createdCategory,
          sub_categories: [{ ...child, sub_categories: [] }],
        });
      });

      await test.step('Find both categories in the full category list', async () => {
        const res = await categoriesClient.list();

        expect(res.status()).toBe(HTTP.OK);
        expect(CategoryListSchema.parse(await res.json())).toEqual(
          expect.arrayContaining([createdCategory, child]),
        );
      });
    },
  );

  test(
    'opening a category that does not exist returns not found',
    { tag: '@negative' },
    async ({ categoriesClient }) => {
      await test.step('Open a category with an id that was never created', async () => {
        const res = await categoriesClient.getById('01NOTAREALCATEGORYID000000');

        expect(res.status()).toBe(HTTP.NOT_FOUND);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Requested item not found' });
      });
    },
  );
});
