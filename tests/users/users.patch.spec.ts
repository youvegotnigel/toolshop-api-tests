import { test, expect } from '../../src/fixtures';
import { UpdateResultSchema, ValidationErrorsSchema } from '../../src/schemas/common.schema';
import { UserSchema } from '../../src/schemas/user.schema';
import { HTTP } from '../../src/utils/http';

test.describe('PATCH /users/{id}', { tag: ['@users', '@patch'] }, () => {
  test('a customer changes just their phone number', async ({ signedInCustomer }) => {
    const { user, users } = signedInCustomer;
    const phone = '+44 20 7946 0958';

    await test.step('The customer updates only the phone number', async () => {
      const res = await users.update(user.id, { phone });

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });

    await test.step('The phone changed and the rest of the profile did not', async () => {
      const res = await users.me();

      expect(res.status()).toBe(HTTP.OK);
      expect(UserSchema.parse(await res.json())).toMatchObject({ ...user, phone });
    });
  });

  test('a phone number with letters is rejected', { tag: '@negative' }, async ({ signedInCustomer }) => {
    const { user, users } = signedInCustomer;

    await test.step('The customer enters a phone number containing letters', async () => {
      const res = await users.update(user.id, { phone: 'call me maybe' });

      expect(res.status()).toBe(HTTP.UNPROCESSABLE);
      expect(Object.keys(ValidationErrorsSchema.parse(await res.json()))).toEqual(['phone']);
    });
  });
});
