import { z } from 'zod';

export const PAYMENT_METHODS = [
  'bank-transfer',
  'cash-on-delivery',
  'credit-card',
  'buy-now-pay-later',
  'gift-card',
] as const;
export const INVOICE_STATUSES = [
  'AWAITING_FULFILLMENT',
  'ON_HOLD',
  'AWAITING_SHIPMENT',
  'SHIPPED',
  'COMPLETED',
] as const;

export const PaymentResultSchema = z.object({ message: z.literal('Payment was successful') });

const money = z.number().nonnegative();

export const InvoiceLineSchema = z.object({
  id: z.string().min(1),
  product_id: z.string().min(1),
  unit_price: money,
  quantity: z.number().int().positive(),
  discount_percentage: z.number().nullable(),
  discounted_price: z.number().nullable(),
  product: z.object({ id: z.string(), name: z.string(), price: money }),
});

/** What POST /invoices and POST /invoices/guest answer with. */
export const InvoiceSchema = z.object({
  id: z.string().min(1),
  invoice_number: z.string().regex(/^INV-\d{4}/, 'invoice numbers start with INV-<year>'),
  invoice_date: z.string(),
  billing_street: z.string(),
  billing_city: z.string(),
  billing_state: z.string().nullable().optional(),
  billing_country: z.string(),
  subtotal: money,
  total: money,
});

/** GET /invoices/{id}: the invoice with its lines, payment and status. */
export const InvoiceDetailSchema = InvoiceSchema.extend({
  status: z.enum(INVOICE_STATUSES),
  status_message: z.string().nullable(),
  invoicelines: z.array(InvoiceLineSchema),
  payment: z.object({ payment_method: z.enum(PAYMENT_METHODS) }),
});

/** GET /invoices and GET /invoices/search: paginated summaries. */
export const InvoicePageSchema = z.object({
  current_page: z.number().int().positive(),
  data: z.array(InvoiceSchema.extend({ status: z.enum(INVOICE_STATUSES) })),
  total: z.number().int().nonnegative(),
});

export const PdfStatusSchema = z.object({ status: z.string() });

export type Invoice = z.infer<typeof InvoiceSchema>;
export type InvoiceDetail = z.infer<typeof InvoiceDetailSchema>;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type Billing = {
  billing_street: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
};

export type CheckoutInput = Billing & {
  cart_id: string;
  payment_method: PaymentMethod;
  payment_details: Record<string, string | number>;
};

export type GuestCheckoutInput = CheckoutInput & {
  guest_email: string;
  guest_first_name: string;
  guest_last_name: string;
};

export type PaymentCheck = { payment_method: string; payment_details: Record<string, string | number> };
