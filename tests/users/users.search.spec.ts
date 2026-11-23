import { test, expect } from '../../src/fixtures';
import { UserPageSchema } from '../../src/schemas/user.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /users/search', { tag: ['@users', '@get'] }, () => {
  test('an admin finds a customer by email', async ({ adminUsersClient, createCustomer }) => {
    const { user } = await createCustomer();

    await test.step('An admin searches customers for the exact email', async () => {
      const res = await adminUsersClient.search(user.email);

      expect(res.status()).toBe(HTTP.OK);
      expect(UserPageSchema.parse(await res.json()).data.map((u) => u.id)).toEqual([user.id]);
    });
  });

  test(
    'a shopper who is not logged in cannot search customers',
    { tag: '@auth' },
    async ({ usersClient }) => {
      await test.step('An anonymous shopper searches customers and is refused', async () => {
        expect((await usersClient.search('qa')).status()).toBe(HTTP.UNAUTHORIZED);
      });
    },
  );
});
