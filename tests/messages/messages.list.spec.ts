import { test, expect } from '../../src/fixtures';
import { MessageSchema } from '../../src/schemas/common.schema';
import { MessagePageSchema } from '../../src/schemas/message.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /messages', { tag: ['@messages', '@get'] }, () => {
  test('a customer sees the message they sent', async ({ customerMessagesClient, sendMessage }) => {
    const sent = await sendMessage();

    await test.step('The customer opens their messages', async () => {
      const res = await customerMessagesClient.list();

      expect(res.status()).toBe(HTTP.OK);
      expect(MessagePageSchema.parse(await res.json()).data.map((m) => m.id)).toContain(sent.id);
    });
  });

  test(
    'a shopper who is not logged in has no message inbox',
    { tag: '@auth' },
    async ({ messagesClient }) => {
      await test.step('An anonymous shopper opens the messages and is refused', async () => {
        const res = await messagesClient.list();

        expect(res.status()).toBe(HTTP.UNAUTHORIZED);
        expect(MessageSchema.parse(await res.json())).toEqual({ message: 'Unauthorized' });
      });
    },
  );
});
