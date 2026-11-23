import { test, expect } from '../../src/fixtures';
import { TokenSchema } from '../../src/schemas/auth.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /users/refresh', { tag: ['@users', '@get'] }, () => {
  // JWT refresh, not the forbidden database reset. Own customer: refreshing retires the old token.
  test('a customer swaps their token for a new one that still opens the account', async ({
    signedInCustomer,
    usersClientFor,
  }) => {
    const fresh = await test.step('The customer asks for a fresh token', async () => {
      const res = await signedInCustomer.users.refreshToken();

      expect(res.status()).toBe(HTTP.OK);
      const token = TokenSchema.parse(await res.json());
      expect(token.access_token).not.toBe(signedInCustomer.token.access_token);
      return token;
    });

    await test.step('The new token opens the customer’s account', async () => {
      const res = await (await usersClientFor(fresh.access_token)).me();

      expect(res.status()).toBe(HTTP.OK);
      expect(await res.json()).toMatchObject({ id: signedInCustomer.user.id });
    });
  });
});
