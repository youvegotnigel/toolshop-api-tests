import { test, expect } from '../../src/fixtures';
import { MessageSchema } from '../../src/schemas/common.schema';
import { HTTP } from '../../src/utils/http';

// See invoices.pdf-status.spec.ts: only the deterministic "not created" answer is asserted.
test.describe('GET /invoices/{invoice_number}/download-pdf', { tag: ['@checkout', '@get'] }, () => {
  test(
    'downloading a PDF that was never generated asks to try again later',
    { tag: '@negative' },
    async ({ adminInvoicesClient }) => {
      await test.step('Download the PDF of an invoice number that has no PDF', async () => {
        const res = await adminInvoicesClient.downloadPdf('INV-0000000000');

        expect(res.status()).toBe(HTTP.NOT_FOUND);
        expect(MessageSchema.parse(await res.json())).toEqual({
          message: 'Document not created. Try again later.',
        });
      });
    },
  );
});
