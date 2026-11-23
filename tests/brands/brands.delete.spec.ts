import { test, expect } from '../../src/fixtures';
import { MessageSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('DELETE /brands/{id}', { tag: ['@brands', '@delete', '@auth'] }, () => {
  test('only an admin can delete a brand, and it is then gone', async ({
    customerBrandsClient,
    adminBrandsClient,
    brandsClient,
    createdBrand,
  }) => {
    await test.step('A customer tries to delete the brand and is refused', async () => {
      const res = await customerBrandsClient.remove(createdBrand.id);

      expect(res.status()).toBe(HTTP.FORBIDDEN);
      expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Forbidden' });
    });

    await test.step('An admin deletes the brand', async () => {
      const res = await adminBrandsClient.remove(createdBrand.id);

      expect(res.status()).toBe(HTTP.NO_CONTENT);
    });

    await test.step('The brand can no longer be found', async () => {
      const res = await brandsClient.getById(createdBrand.id);

      expect(res.status()).toBe(HTTP.NOT_FOUND);
      expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Requested item not found' });
    });
  });

  test(
    'a shopper who is not logged in cannot delete a brand',
    { tag: '@auth' },
    async ({ brandsClient, createdBrand }) => {
      await test.step('An anonymous shopper tries to delete the brand and is refused', async () => {
        const res = await brandsClient.remove(createdBrand.id);

        expect(res.status()).toBe(HTTP.UNAUTHORIZED);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Unauthorized' });
      });

      await test.step('The brand is still there', async () => {
        const res = await brandsClient.getById(createdBrand.id);

        expect(res.status()).toBe(HTTP.OK);
        expect(await res.json()).toEqual(createdBrand);
      });
    },
  );
});
