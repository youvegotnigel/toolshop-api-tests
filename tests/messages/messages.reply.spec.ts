import { test, expect } from '../../src/fixtures';
import { MessageDetailSchema, ReplySchema } from '../../src/schemas/message.schema';
import { HTTP } from '../../src/utils/http';

test.describe('POST /messages/{id}/reply', { tag: ['@messages', '@post'] }, () => {
  test('an admin replies and the customer sees the answer with the message in progress', async ({
    adminMessagesClient,
    customerMessagesClient,
    sendMessage,
  }) => {
    const sent = await sendMessage();
    const answer = 'Thanks, we are looking into it.';

    await test.step('An admin replies to the message', async () => {
      const res = await adminMessagesClient.reply(sent.id, answer);

      expect(res.status()).toBe(HTTP.CREATED);
      expect(ReplySchema.pick({ message: true }).parse(await res.json())).toEqual({ message: answer });
    });

    await test.step('The customer sees the reply and the message is in progress', async () => {
      const res = await customerMessagesClient.get(sent.id);

      expect(res.status()).toBe(HTTP.OK);
      const detail = MessageDetailSchema.parse(await res.json());
      expect(detail.status).toBe('IN_PROGRESS');
      expect(detail.replies.map((r) => r.message)).toEqual([answer]);
    });
  });
});
