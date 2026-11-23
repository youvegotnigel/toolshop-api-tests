import { test, expect } from '../../src/fixtures';
import { buildProductSpec } from '../../src/data/product.builder';
import { LaravelValidationErrorSchema, MessageSchema } from '../../src/schemas/common.schema';
import { ProductSpecSchema } from '../../src/schemas/product.schema';
import { HTTP } from '../../src/utils/http';

test.describe('POST /products/{productId}/specs', { tag: ['@products', '@post'] }, () => {
  test('a logged-in user adds a spec to a product', async ({
    customerProductsClient,
    createdProduct,
    cleanup,
  }) => {
    const { product } = createdProduct;
    const input = buildProductSpec();

    await test.step('Add a weight spec to the product', async () => {
      const res = await customerProductsClient.addSpec(product.id, input);

      expect(res.status()).toBe(HTTP.CREATED);
      const spec = ProductSpecSchema.parse(await res.json());
      cleanup.add(`delete spec ${spec.id}`, () => customerProductsClient.removeSpec(product.id, spec.id));
      expect(spec).toMatchObject({ ...input, product_id: product.id });
    });
  });

  test(
    'a spec without a value is rejected',
    { tag: '@negative' },
    async ({ customerProductsClient, createdProduct }) => {
      await test.step('Try to add a spec with a name but no value', async () => {
        const { spec_name } = buildProductSpec();
        const res = await customerProductsClient.addSpec(createdProduct.product.id, {
          spec_name,
          spec_value: '',
          spec_unit: null,
        });

        expect(res.status()).toBe(HTTP.UNPROCESSABLE);
        expect(Object.keys(LaravelValidationErrorSchema.parse(await res.json()).errors)).toContain(
          'spec_value',
        );
      });
    },
  );

  test(
    'a shopper who is not logged in cannot add specs',
    { tag: '@auth' },
    async ({ productsClient, createdProduct }) => {
      await test.step('An anonymous shopper tries to add a spec and is refused', async () => {
        const res = await productsClient.addSpec(createdProduct.product.id, buildProductSpec());

        expect(res.status()).toBe(HTTP.UNAUTHORIZED);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Unauthorized' });
      });
    },
  );
});
