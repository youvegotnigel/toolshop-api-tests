import { test, expect } from '../../src/fixtures';
import { buildCustomer } from '../../src/data/user.builder';
import { ValidationErrorsSchema } from '../../src/schemas/common.schema';
import { RegisteredUserSchema } from '../../src/schemas/user.schema';
import { HTTP } from '../../src/utils/http';

test.describe('POST /users/register', { tag: ['@users', '@post'] }, () => {
  test(
    'a new customer registers and can log in with the same details',
    { tag: '@smoke', annotation: { type: 'covers', description: 'POST /users/login' } },
    async ({ usersClient, adminUsersClient, authClient, cleanup }) => {
      const registration = buildCustomer();

      await test.step('A shopper registers an account', async () => {
        const res = await usersClient.register(registration);

        expect(res.status()).toBe(HTTP.CREATED);
        const user = RegisteredUserSchema.parse(await res.json());
        cleanup.add(`delete customer ${user.id}`, () => adminUsersClient.remove(user.id));
        expect(user).toMatchObject({
          email: registration.email,
          first_name: registration.first_name,
          last_name: registration.last_name,
        });
        expect(await res.json()).not.toHaveProperty('password');
      });

      await test.step('The new customer logs in with the same email and password', async () => {
        const res = await authClient.login({ email: registration.email, password: registration.password });

        expect(res.status()).toBe(HTTP.OK);
      });
    },
  );

  test(
    'registering twice with the same email is refused',
    { tag: '@negative' },
    async ({ usersClient, createCustomer }) => {
      const { credentials } = await createCustomer();

      await test.step('Try to register another account with an email that is already in use', async () => {
        const res = await usersClient.registerRaw(buildCustomer({ email: credentials.email }));

        expect(res.status()).toBe(HTTP.CONFLICT);
        expect(ValidationErrorsSchema.parse(await res.json())).toEqual({
          email: ['A customer with this email address already exists.'],
        });
      });
    },
  );

  for (const { reason, field, overrides } of [
    { reason: 'the email is missing', field: 'email', overrides: { email: undefined } },
    { reason: 'the password is too weak', field: 'password', overrides: { password: 'password' } },
    {
      reason: 'the customer is under 18',
      field: 'dob',
      overrides: { dob: new Date().toISOString().slice(0, 10) },
    },
  ]) {
    test(`registration is rejected when ${reason}`, { tag: '@negative' }, async ({ usersClient }) => {
      await test.step(`Try to register where ${reason}`, async () => {
        const res = await usersClient.registerRaw({ ...buildCustomer(), ...overrides });

        expect(res.status()).toBe(HTTP.UNPROCESSABLE);
        expect(Object.keys(ValidationErrorsSchema.parse(await res.json()))).toContain(field);
      });
    });
  }

  test(
    'asking for the admin role at registration still creates a regular customer',
    { tag: '@auth' },
    async ({ usersClient, adminUsersClient, signIn, cleanup }) => {
      const registration = buildCustomer();

      await test.step('A shopper registers and sneaks in role "admin"', async () => {
        const res = await usersClient.registerRaw({ ...registration, role: 'admin' });

        expect(res.status()).toBe(HTTP.CREATED);
        const user = RegisteredUserSchema.parse(await res.json());
        cleanup.add(`delete customer ${user.id}`, () => adminUsersClient.remove(user.id));
      });

      await test.step('Logged in, the account is refused the admin-only customer list', async () => {
        const { users } = await signIn({ email: registration.email, password: registration.password });

        expect((await users.list()).status()).toBe(HTTP.FORBIDDEN);
      });
    },
  );
});
