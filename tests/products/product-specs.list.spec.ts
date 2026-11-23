import { test, expect } from '../../src/fixtures';
import { ProductSpecListSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /products/{productId}/specs', { tag: ['@products', '@get'] }, () => {
  test('a shopper sees every spec of a product, and only that product’s specs', async ({
    productsClient,
    createdProduct,
    createProduct,
    createSpec,
  }) => {
    const { product } = createdProduct;
    const weight = await createSpec(product.id);
    const colour = await createSpec(product.id, { spec_name: `${weight.spec_name} colour`, spec_unit: null });

    await test.step('Open the specs of the product', async () => {
      const res = await productsClient.specs(product.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(ProductSpecListSchema.parse(await res.json())).toEqual(expect.arrayContaining([weight, colour]));
    });

    await test.step('Another product in the same category has no specs', async () => {
      const other = await createProduct({ brand: createdProduct.brand, category: createdProduct.category });
      const res = await productsClient.specs(other.product.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(ProductSpecListSchema.parse(await res.json())).toEqual([]);
    });
  });
});
