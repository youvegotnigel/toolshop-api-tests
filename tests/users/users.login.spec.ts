import { test, expect } from '../../src/fixtures';
import { TokenSchema } from '../../src/schemas/auth.schema';
import { ErrorSchema } from '../../src/schemas/user.schema';
import { HTTP } from '../../src/utils/http';

const LOCKED = 423;
const MAX_FAILED_LOGINS = 3;

test.describe('POST /users/login', { tag: ['@users', '@post'] }, () => {
  test(
    'a customer logs in and gets a bearer token that opens their account',
    { tag: '@smoke' },
    async ({ authClient, usersClientFor, createCustomer }) => {
      const { user, credentials } = await createCustomer();

      const token = await test.step('The customer logs in with email and password', async () => {
        const res = await authClient.login(credentials);

        expect(res.status()).toBe(HTTP.OK);
        const body = TokenSchema.parse(await res.json());
        expect(body.token_type).toBe('bearer');
        return body.access_token;
      });

      await test.step('The token opens the customer’s own account', async () => {
        const res = await (await usersClientFor(token)).me();

        expect(res.status()).toBe(HTTP.OK);
        expect(await res.json()).toMatchObject({ id: user.id });
      });
    },
  );

  test(
    'a wrong password is refused without a token',
    { tag: '@negative' },
    async ({ authClient, createCustomer }) => {
      const { credentials } = await createCustomer();

      await test.step('The customer logs in with the wrong password', async () => {
        const res = await authClient.login({ ...credentials, password: `${credentials.password}x` });

        expect(res.status()).toBe(HTTP.UNAUTHORIZED);
        expect(ErrorSchema.parse(await res.json())).toEqual({ error: 'Unauthorized' });
      });
    },
  );

  // Uses a customer of its own: locking it affects nobody else, and the admin deletes it afterwards.
  test(
    'too many wrong passwords lock the account, even for the right password',
    { tag: '@negative' },
    async ({ authClient, createCustomer }) => {
      const { credentials } = await createCustomer();
      const wrong = { ...credentials, password: `${credentials.password}x` };

      await test.step(`The customer gets the password wrong ${String(MAX_FAILED_LOGINS)} times`, async () => {
        for (let attempt = 1; attempt <= MAX_FAILED_LOGINS; attempt += 1) {
          expect((await authClient.login(wrong)).status(), `attempt ${String(attempt)}`).toBe(
            HTTP.UNAUTHORIZED,
          );
        }
      });

      await test.step('Now even the right password is refused because the account is locked', async () => {
        const res = await authClient.login(credentials);

        expect(res.status()).toBe(LOCKED);
        expect(ErrorSchema.parse(await res.json()).error).toMatch(/locked/i);
      });
    },
  );
});
