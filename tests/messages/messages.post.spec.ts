import { test, expect } from '../../src/fixtures';
import { buildMessage } from '../../src/data/message.builder';
import { ValidationErrorsSchema } from '../../src/schemas/common.schema';
import { MessageRecordSchema } from '../../src/schemas/message.schema';
import { HTTP } from '../../src/utils/http';

test.describe('POST /messages', { tag: ['@messages', '@post'] }, () => {
  test('a shopper sends a message through the contact form', async ({ messagesClient }) => {
    const contact = buildMessage();

    await test.step('An anonymous shopper sends a message', async () => {
      const res = await messagesClient.send(contact);

      expect(res.status()).toBe(HTTP.OK);
      expect(MessageRecordSchema.parse(await res.json())).toMatchObject({
        subject: contact.subject,
        message: contact.message,
        status: 'NEW',
      });
    });
  });

  for (const { reason, field, change } of [
    { reason: 'the subject is missing', field: 'subject', change: { subject: undefined } },
    { reason: 'the message is over 250 characters', field: 'message', change: { message: 'x'.repeat(251) } },
  ]) {
    test(`a message is rejected when ${reason}`, { tag: '@negative' }, async ({ messagesClient }) => {
      await test.step(`Send a message where ${reason}`, async () => {
        const res = await messagesClient.send({ ...buildMessage(), ...change });

        expect(res.status()).toBe(HTTP.UNPROCESSABLE);
        expect(Object.keys(ValidationErrorsSchema.parse(await res.json()))).toEqual([field]);
      });
    });
  }
});
