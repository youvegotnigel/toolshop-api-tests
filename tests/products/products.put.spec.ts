import { test, expect } from '../../src/fixtures';
import { buildProduct } from '../../src/data/product.builder';
import { UpdateResultSchema } from '../../src/schemas/common.schema';
import { ProductSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('PUT /products/{id}', { tag: ['@products', '@put'] }, () => {
  test('replacing a product moves it to another brand with a new name and price', async ({
    productsClient,
    createdProduct,
    createBrand,
  }) => {
    const newBrand = await createBrand();
    const replacement = buildProduct({ ...createdProduct.input, brand_id: newBrand.id });

    await test.step('Replace the whole product', async () => {
      const res = await productsClient.replace(createdProduct.product.id, replacement);

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });

    await test.step('The product shows the new name, price and brand', async () => {
      const res = await productsClient.getById(createdProduct.product.id);

      expect(res.status()).toBe(HTTP.OK);
      const shown = ProductSchema.parse(await res.json());
      expect(shown).toMatchObject({ name: replacement.name, price: replacement.price });
      expect(shown.brand.id).toBe(newBrand.id);
    });
  });
});
