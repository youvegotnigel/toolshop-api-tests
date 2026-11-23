import { test, expect } from '../../src/fixtures';
import { ProductSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /products/{id}/related', { tag: ['@products', '@get'] }, () => {
  test('related products come from the same category and never include the product itself', async ({
    productsClient,
    createdCategory,
    createProduct,
  }) => {
    const viewed = await createProduct({ category: createdCategory });
    const sibling = await createProduct({ category: createdCategory });
    const elsewhere = await createProduct();

    await test.step('A shopper looks at the products related to the one they are viewing', async () => {
      const res = await productsClient.related(viewed.product.id);

      expect(res.status()).toBe(HTTP.OK);
      const ids = ProductSchema.array()
        .parse(await res.json())
        .map((p) => p.id);
      expect(ids).toEqual([sibling.product.id]);
      expect(ids).not.toContain(elsewhere.product.id);
    });
  });
});
