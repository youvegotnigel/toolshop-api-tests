import { test, expect } from '../../src/fixtures';
import { UpdateResultSchema } from '../../src/schemas/common.schema';
import { AttachErrorsSchema } from '../../src/schemas/message.schema';
import { HTTP } from '../../src/utils/http';

// The API only accepts empty .txt files: a deliberate quirk of the practice application.
test.describe('POST /messages/{id}/attach-file', { tag: ['@messages', '@post'] }, () => {
  test('an empty text file can be attached to a message', async ({ messagesClient, sendMessage }) => {
    const sent = await sendMessage();

    await test.step('Attach an empty notes.txt to the message', async () => {
      const res = await messagesClient.attach(sent.id, { name: 'notes.txt', content: '' });

      expect(res.status()).toBe(HTTP.OK);
      expect(UpdateResultSchema.parse(await res.json())).toEqual({ success: true });
    });
  });

  test('a file with content is refused', { tag: '@negative' }, async ({ messagesClient, sendMessage }) => {
    const sent = await sendMessage();

    await test.step('Attach a notes.txt that is not empty', async () => {
      const res = await messagesClient.attach(sent.id, { name: 'notes.txt', content: 'hello' });

      expect(res.status()).toBe(HTTP.BAD_REQUEST);
      expect(AttachErrorsSchema.parse(await res.json())).toEqual({
        errors: ['Currently we only allow empty files.'],
      });
    });
  });
});
