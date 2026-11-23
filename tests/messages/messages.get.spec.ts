import { test, expect } from '../../src/fixtures';
import { MessageDetailSchema } from '../../src/schemas/message.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /messages/{id}', { tag: ['@messages', '@get'] }, () => {
  test('a customer opens their message, still new and without replies', async ({
    customerMessagesClient,
    sendMessage,
  }) => {
    const sent = await sendMessage();

    await test.step('The customer opens the message', async () => {
      const res = await customerMessagesClient.get(sent.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(MessageDetailSchema.parse(await res.json())).toMatchObject({
        id: sent.id,
        subject: sent.subject,
        status: 'NEW',
        replies: [],
      });
    });
  });
});
