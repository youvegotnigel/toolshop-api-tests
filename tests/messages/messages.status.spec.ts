import { test, expect } from '../../src/fixtures';
import { LaravelValidationErrorSchema, UpdateResultSchema } from '../../src/schemas/common.schema';
import { MessageDetailSchema } from '../../src/schemas/message.schema';
import { HTTP } from '../../src/utils/http';
import { knownBug } from '../../src/utils/known-bug';

test.describe('PUT /messages/{id}/status', { tag: ['@messages', '@put'] }, () => {
  test('an admin resolves a message and the customer sees it resolved', async ({
    adminMessagesClient,
    customerMessagesClient,
    sendMessage,
  }) => {
    const sent = await sendMessage();

    await test.step('An admin marks the message as resolved', async () => {
      const res = await adminMessagesClient.setStatus(sent.id, 'RESOLVED');

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });

    await test.step('The customer sees the message as resolved', async () => {
      const res = await customerMessagesClient.get(sent.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(MessageDetailSchema.parse(await res.json()).status).toBe('RESOLVED');
    });
  });

  test(
    'a status that does not exist is rejected',
    { tag: '@negative' },
    async ({ adminMessagesClient, sendMessage }) => {
      const sent = await sendMessage();

      await test.step('An admin tries to set the status to CLOSED', async () => {
        const res = await adminMessagesClient.setStatus(sent.id, 'CLOSED');

        expect(res.status()).toBe(HTTP.UNPROCESSABLE);
        expect(Object.keys(LaravelValidationErrorSchema.parse(await res.json()).errors)).toEqual(['status']);
      });
    },
  );

  test.fail(
    'another customer cannot resolve my message',
    knownBug(22, 'Any customer can change or reply to any contact message (no ownership check)', ['@auth']),
    async ({ customerMessagesClient, sendMessage, signedInCustomer, messagesClientFor }) => {
      const sent = await sendMessage();
      const otherCustomer = await messagesClientFor(signedInCustomer.token.access_token);

      await test.step('Another customer tries to resolve my message and is refused', async () => {
        expect([HTTP.FORBIDDEN, HTTP.NOT_FOUND]).toContain(
          (await otherCustomer.setStatus(sent.id, 'RESOLVED')).status(),
        );
      });

      await test.step('My message is still new', async () => {
        const res = await customerMessagesClient.get(sent.id);

        expect(MessageDetailSchema.parse(await res.json()).status).toBe('NEW');
      });
    },
  );
});
