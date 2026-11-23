import { test, expect } from '../../src/fixtures';
import { MessageSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('DELETE /users/{id}', { tag: ['@users', '@delete', '@auth'] }, () => {
  test('an admin deletes a customer, who can then no longer log in', async ({
    adminUsersClient,
    authClient,
    createCustomer,
  }) => {
    const { user, credentials } = await createCustomer();

    await test.step('An admin deletes the customer', async () => {
      expect((await adminUsersClient.remove(user.id)).status()).toBe(HTTP.NO_CONTENT);
    });

    await test.step('The deleted customer cannot log in any more', async () => {
      expect((await authClient.login(credentials)).status()).toBe(HTTP.UNAUTHORIZED);
    });
  });

  test('a customer cannot delete an account', async ({ signedInCustomer, createCustomer }) => {
    const other = await createCustomer();

    await test.step('A logged-in customer tries to delete another account and is refused', async () => {
      const res = await signedInCustomer.users.remove(other.user.id);

      expect(res.status()).toBe(HTTP.FORBIDDEN);
      expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Forbidden' });
    });
  });
});
