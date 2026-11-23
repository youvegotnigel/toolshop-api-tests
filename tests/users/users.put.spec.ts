import { test, expect } from '../../src/fixtures';
import { buildProfile } from '../../src/data/user.builder';
import { UpdateResultSchema } from '../../src/schemas/common.schema';
import { ErrorSchema, UserSchema } from '../../src/schemas/user.schema';
import { HTTP } from '../../src/utils/http';

test.describe('PUT /users/{id}', { tag: ['@users', '@put'] }, () => {
  test('a customer replaces their whole profile, address included', async ({ signedInCustomer }) => {
    const { user, users } = signedInCustomer;
    const profile = buildProfile(user.email);

    await test.step('The customer saves a complete new profile', async () => {
      const res = await users.replace(user.id, profile);

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });

    await test.step('The profile shows every new detail', async () => {
      const res = await users.me();

      expect(res.status()).toBe(HTTP.OK);
      expect(UserSchema.parse(await res.json())).toEqual({ id: user.id, ...profile });
    });
  });

  test(
    'a customer cannot change another customer’s profile',
    { tag: '@auth' },
    async ({ signedInCustomer, createCustomer }) => {
      const other = await createCustomer();

      await test.step('The customer tries to overwrite someone else’s profile and is refused', async () => {
        const res = await signedInCustomer.users.replace(other.user.id, buildProfile(other.user.email));

        expect(res.status()).toBe(HTTP.FORBIDDEN);
        expect(ErrorSchema.parse(await res.json())).toEqual({ error: 'You can only update your own data.' });
      });
    },
  );
});
