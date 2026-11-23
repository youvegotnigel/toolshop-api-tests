import { test, expect } from '../../src/fixtures';
import { PdfStatusSchema } from '../../src/schemas/invoice.schema';
import { HTTP } from '../../src/utils/http';

// PDFs are made by a scheduled job, so a new invoice has none for an unpredictable time.
// Only the deterministic "never generated" answer is asserted: the dashboard shows this as negative-only.
test.describe('GET /invoices/{invoice_number}/download-pdf-status', { tag: ['@checkout', '@get'] }, () => {
  test(
    'asking for a PDF that was never generated says it has not started',
    { tag: '@negative' },
    async ({ adminInvoicesClient }) => {
      await test.step('Ask for the PDF status of an invoice number that has no PDF', async () => {
        const res = await adminInvoicesClient.pdfStatus('INV-0000000000');

        expect(res.status()).toBe(HTTP.BAD_REQUEST);
        expect(PdfStatusSchema.parse(await res.json())).toEqual({ status: 'NOT_INITIATED' });
      });
    },
  );
});
