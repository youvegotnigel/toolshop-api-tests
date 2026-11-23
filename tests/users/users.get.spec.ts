import { test, expect } from '../../src/fixtures';
import { ErrorSchema, UserSchema } from '../../src/schemas/user.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /users/{id}', { tag: ['@users', '@get'] }, () => {
  test('a customer opens their own account and an admin can open it too', async ({
    signedInCustomer,
    adminUsersClient,
  }) => {
    const { user, users } = signedInCustomer;

    await test.step('The customer opens their own account by id', async () => {
      const res = await users.getById(user.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(UserSchema.parse(await res.json())).toMatchObject(user);
    });

    await test.step('An admin opens the same account', async () => {
      const res = await adminUsersClient.getById(user.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(UserSchema.parse(await res.json()).id).toBe(user.id);
    });
  });

  test(
    'a customer cannot open another customer’s account',
    { tag: '@auth' },
    async ({ signedInCustomer, createCustomer }) => {
      const other = await createCustomer();

      await test.step('The customer opens someone else’s account and is told it is not found', async () => {
        const res = await signedInCustomer.users.getById(other.user.id);

        expect(res.status()).toBe(HTTP.NOT_FOUND);
        expect(ErrorSchema.parse(await res.json())).toEqual({
          error: 'You are not authorized to view this user.',
        });
      });
    },
  );
});
