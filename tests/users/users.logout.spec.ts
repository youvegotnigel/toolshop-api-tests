import { test, expect } from '../../src/fixtures';
import { MessageSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /users/logout', { tag: ['@users', '@get'] }, () => {
  // A customer of its own: logging out the worker's shared customer would break other tests.
  test('after logging out, the old token no longer opens the account', async ({ signedInCustomer }) => {
    await test.step('The customer logs out', async () => {
      const res = await signedInCustomer.users.logout();

      expect(res.status()).toBe(HTTP.OK);
      expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Successfully logged out' });
    });

    await test.step('The same token is now refused', async () => {
      expect((await signedInCustomer.users.me()).status()).toBe(HTTP.UNAUTHORIZED);
    });
  });
});
