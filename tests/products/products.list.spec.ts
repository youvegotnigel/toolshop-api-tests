import { test, expect } from '../../src/fixtures';
import { ProductPageSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /products', { tag: ['@products', '@get'] }, () => {
  test('filtering by category lists exactly that category’s products', async ({
    productsClient,
    createdCategory,
    createProduct,
  }) => {
    const first = await createProduct({ category: createdCategory });
    const second = await createProduct({ category: createdCategory });

    await test.step('A shopper browses the category', async () => {
      const res = await productsClient.list({ by_category_slug: createdCategory.slug });

      expect(res.status()).toBe(HTTP.OK);
      const page = ProductPageSchema.parse(await res.json());
      expect(page.current_page).toBe(1);
      expect(page.data.map((p) => p.id).sort()).toEqual([first.product.id, second.product.id].sort());
    });
  });

  test('rental products are listed only when rentals are asked for', async ({
    productsClient,
    createdCategory,
    createProduct,
  }) => {
    const rental = await createProduct({ category: createdCategory, overrides: { is_rental: true } });

    await test.step('Browsing the category normally does not show the rental', async () => {
      const res = await productsClient.list({ by_category_slug: createdCategory.slug });

      expect(res.status()).toBe(HTTP.OK);
      expect(ProductPageSchema.parse(await res.json()).data).toEqual([]);
    });

    await test.step('Browsing rentals in the category shows it', async () => {
      const res = await productsClient.list({ by_category_slug: createdCategory.slug, is_rental: true });

      expect(res.status()).toBe(HTTP.OK);
      expect(ProductPageSchema.parse(await res.json()).data.map((p) => p.id)).toEqual([rental.product.id]);
    });
  });
});
