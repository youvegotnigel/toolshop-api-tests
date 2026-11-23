import { test, expect } from '../../src/fixtures';
import { buildCategory } from '../../src/data/category.builder';
import { CategoryNodeSchema, CategorySchema } from '../../src/schemas/category.schema';
import { ValidationErrorsSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('POST /categories', { tag: ['@categories', '@post'] }, () => {
  test(
    'a new top-level category is created and matches the API contract',
    { tag: '@smoke' },
    async ({ categoriesClient, adminCategoriesClient, cleanup }) => {
      const newCategory = buildCategory();

      const created = await test.step('Create a category with a unique name and slug', async () => {
        const res = await categoriesClient.create(newCategory);

        expect(res.status()).toBe(HTTP.CREATED);
        const category = CategorySchema.parse(await res.json());
        cleanup.add(`delete category ${category.id}`, () => adminCategoriesClient.remove(category.id));
        return category;
      });

      await test.step('Check the response echoes exactly what was sent', () => {
        expect(created).toMatchObject(newCategory);
      });
    },
  );

  test('a subcategory is created under an existing category', async ({
    categoriesClient,
    createdCategory,
    createCategory,
  }) => {
    const child = await test.step('Create a subcategory under the parent', async () =>
      createCategory({ parent_id: createdCategory.id }));

    await test.step('The subcategory points at its parent', () => {
      expect(child.parent_id).toBe(createdCategory.id);
    });

    await test.step('The parent now lists the subcategory', async () => {
      const res = await categoriesClient.getById(createdCategory.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(CategoryNodeSchema.parse(await res.json()).sub_categories.map((c) => c.id)).toEqual([child.id]);
    });
  });

  for (const { reason, field, body } of [
    { reason: 'the name is missing', field: 'name', body: { slug: buildCategory().slug } },
    { reason: 'the slug is missing', field: 'slug', body: { name: buildCategory().name } },
    { reason: 'the slug contains spaces', field: 'slug', body: { ...buildCategory(), slug: 'has spaces' } },
  ]) {
    test(`a category is rejected when ${reason}`, { tag: '@negative' }, async ({ categoriesClient }) => {
      await test.step(`Try to create a category where ${reason}`, async () => {
        const res = await categoriesClient.createRaw(body);

        expect(res.status()).toBe(HTTP.UNPROCESSABLE);
        expect(Object.keys(ValidationErrorsSchema.parse(await res.json()))).toContain(field);
      });
    });
  }

  test(
    'a second category with the same slug is refused',
    { tag: '@negative' },
    async ({ categoriesClient, createdCategory }) => {
      await test.step('Try to create another category reusing an existing slug', async () => {
        const res = await categoriesClient.createRaw(buildCategory({ slug: createdCategory.slug }));

        expect(res.status()).toBe(HTTP.CONFLICT);
        expect(ValidationErrorsSchema.parse(await res.json())).toEqual({
          slug: ['A category already exists with this slug.'],
        });
      });
    },
  );
});
