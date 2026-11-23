import { test, expect } from '../../src/fixtures';
import { MessageSchema } from '../../src/schemas/common.schema';
import { UserPageSchema } from '../../src/schemas/user.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /users', { tag: ['@users', '@get'] }, () => {
  test('an admin pages through customers and sees only customers', async ({ adminUsersClient }) => {
    await test.step('An admin opens the first page of customers', async () => {
      const res = await adminUsersClient.list();

      expect(res.status()).toBe(HTTP.OK);
      const page = UserPageSchema.parse(await res.json());
      expect(page.current_page).toBe(1);
      expect(page.total).toBeGreaterThanOrEqual(page.data.length);
      expect(JSON.stringify(page.data)).not.toMatch(/"password"/);
    });
  });

  test('a customer cannot see the list of customers', { tag: '@auth' }, async ({ customerUsersClient }) => {
    await test.step('A logged-in customer opens the customer list and is refused', async () => {
      const res = await customerUsersClient.list();

      expect(res.status()).toBe(HTTP.FORBIDDEN);
      expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Forbidden' });
    });
  });
});
