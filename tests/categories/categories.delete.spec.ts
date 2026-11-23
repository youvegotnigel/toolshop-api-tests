import { test, expect } from '../../src/fixtures';
import { MessageSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('DELETE /categories/{id}', { tag: ['@categories', '@delete'] }, () => {
  test(
    'an admin deletes a category and it can no longer be opened',
    { tag: '@smoke' },
    async ({ adminCategoriesClient, categoriesClient, createdCategory }) => {
      await test.step('An admin deletes the category', async () => {
        const res = await adminCategoriesClient.remove(createdCategory.id);

        expect(res.status()).toBe(HTTP.NO_CONTENT);
      });

      await test.step('Opening the deleted category returns not found', async () => {
        const res = await categoriesClient.getById(createdCategory.id);

        expect(res.status()).toBe(HTTP.NOT_FOUND);
      });
    },
  );

  test(
    'a category that still has subcategories cannot be deleted',
    { tag: '@negative' },
    async ({ adminCategoriesClient, createdCategory, createCategory }) => {
      await createCategory({ parent_id: createdCategory.id });

      await test.step('An admin tries to delete the parent category and is refused', async () => {
        const res = await adminCategoriesClient.remove(createdCategory.id);

        expect(res.status()).toBe(HTTP.CONFLICT);
        expect(MessageSchema.parse(await res.json()).message).toBe(
          'Seems like this category is used elsewhere.',
        );
      });
    },
  );

  test(
    'a customer cannot delete a category',
    { tag: '@auth' },
    async ({ customerCategoriesClient, categoriesClient, createdCategory }) => {
      await test.step('A logged-in customer tries to delete the category and is refused', async () => {
        const res = await customerCategoriesClient.remove(createdCategory.id);

        expect(res.status()).toBe(HTTP.FORBIDDEN);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Forbidden' });
      });

      await test.step('The category is still there', async () => {
        const res = await categoriesClient.getById(createdCategory.id);

        expect(res.status()).toBe(HTTP.OK);
      });
    },
  );
});
