import { test, expect } from '../../src/fixtures';
import { MessageSchema } from '../../src/schemas/common.schema';
import { UserSchema } from '../../src/schemas/user.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /users/me', { tag: ['@users', '@get'] }, () => {
  test('a logged-in customer sees their own profile', { tag: '@smoke' }, async ({ signedInCustomer }) => {
    await test.step('The customer opens their profile', async () => {
      const res = await signedInCustomer.users.me();

      expect(res.status()).toBe(HTTP.OK);
      const me = UserSchema.parse(await res.json());
      expect(me).toMatchObject(signedInCustomer.user);
      expect(await res.json()).not.toHaveProperty('password');
    });
  });

  test('a shopper who is not logged in has no profile', { tag: '@auth' }, async ({ usersClient }) => {
    await test.step('An anonymous shopper opens the profile page and is refused', async () => {
      const res = await usersClient.me();

      expect(res.status()).toBe(HTTP.UNAUTHORIZED);
      expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Unauthorized' });
    });
  });
});
