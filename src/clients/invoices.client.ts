import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import { NO_CACHE } from '../utils/http';
import type { Message, UpdateResult, ValidationErrors } from '../schemas/common.schema';
import type {
  CheckoutInput,
  GuestCheckoutInput,
  Invoice,
  InvoiceDetail,
  PaymentCheck,
} from '../schemas/invoice.schema';

type Page<T> = { current_page: number; data: T[]; total: number };

/**
 * Toolshop /invoices. Everything needs a login except guest checkout; customers only see their own invoices.
 * There is no DELETE: an invoice, its customer and its products stay until the hourly database reset.
 */
export class InvoicesClient extends BaseClient {
  private readonly path = '/invoices';

  create(
    checkout: CheckoutInput | Record<string, unknown>,
  ): Promise<APIResponse<Invoice | ValidationErrors>> {
    return this.request.post<Invoice | ValidationErrors>(this.path, { data: checkout });
  }

  createGuest(checkout: GuestCheckoutInput | Record<string, unknown>): Promise<APIResponse<Invoice>> {
    return this.request.post<Invoice>(`${this.path}/guest`, { data: checkout });
  }

  list(): Promise<APIResponse<Page<Invoice>>> {
    return this.request.get<Page<Invoice>>(this.path, { headers: NO_CACHE });
  }

  search(q: string): Promise<APIResponse<Page<Invoice>>> {
    return this.request.get<Page<Invoice>>(`${this.path}/search`, { params: { q }, headers: NO_CACHE });
  }

  get(id: string): Promise<APIResponse<InvoiceDetail | Message>> {
    return this.request.get<InvoiceDetail | Message>(`${this.path}/${id}`, { headers: NO_CACHE });
  }

  replace(id: string, checkout: CheckoutInput): Promise<APIResponse<UpdateResult>> {
    return this.request.put<UpdateResult>(`${this.path}/${id}`, { data: checkout });
  }

  update(id: string, changes: Record<string, unknown>): Promise<APIResponse<UpdateResult | Message>> {
    return this.request.patch<UpdateResult | Message>(`${this.path}/${id}`, { data: changes });
  }

  /** `status` is a string so negative tests can send values outside INVOICE_STATUSES. */
  setStatus(
    id: string,
    status: string,
    status_message?: string,
  ): Promise<APIResponse<UpdateResult | Message>> {
    return this.request.put<UpdateResult | Message>(`${this.path}/${id}/status`, {
      data: { status, status_message },
    });
  }

  pdfStatus(invoiceNumber: string): Promise<APIResponse<{ status: string }>> {
    return this.request.get<{ status: string }>(`${this.path}/${invoiceNumber}/download-pdf-status`);
  }

  downloadPdf(invoiceNumber: string): Promise<APIResponse<Message>> {
    return this.request.get<Message>(`${this.path}/${invoiceNumber}/download-pdf`);
  }
}

/** Toolshop /payment/check: public validation of payment details per method. */
export class PaymentClient extends BaseClient {
  check(payment: PaymentCheck): Promise<APIResponse<Message>> {
    return this.request.post<Message>('/payment/check', { data: payment });
  }
}
