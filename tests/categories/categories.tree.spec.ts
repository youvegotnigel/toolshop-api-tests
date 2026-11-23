import { test, expect } from '../../src/fixtures';
import { CategoryTreeSchema } from '../../src/schemas/category.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /categories/tree', { tag: ['@categories', '@get'] }, () => {
  test('the category tree nests a subcategory under its parent', async ({
    categoriesClient,
    createdCategory,
    createCategory,
  }) => {
    const child = await createCategory({ parent_id: createdCategory.id });

    await test.step('Open the tree for the parent category only', async () => {
      const res = await categoriesClient.tree(createdCategory.slug);

      expect(res.status()).toBe(HTTP.OK);
      expect(CategoryTreeSchema.parse(await res.json())).toEqual([
        { ...createdCategory, sub_categories: [{ ...child, sub_categories: [] }] },
      ]);
    });
  });

  test('the full tree only lists top-level categories at its root', async ({
    categoriesClient,
    createdCategory,
    createCategory,
  }) => {
    const child = await createCategory({ parent_id: createdCategory.id });

    await test.step('Open the full category tree', async () => {
      const res = await categoriesClient.tree();

      expect(res.status()).toBe(HTTP.OK);
      const roots = CategoryTreeSchema.parse(await res.json());
      expect(roots.every((root) => root.parent_id === null)).toBe(true);
      expect(roots.map((root) => root.id)).toContain(createdCategory.id);
      expect(roots.map((root) => root.id)).not.toContain(child.id);
    });
  });
});
