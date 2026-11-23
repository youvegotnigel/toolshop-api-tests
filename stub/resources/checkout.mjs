import { carts, invoices, products } from '../store.mjs';
import { NOT_FOUND, newId, requireRole, send, sessionOf } from '../lib.mjs';

const METHODS = ['bank-transfer', 'cash-on-delivery', 'credit-card', 'buy-now-pay-later', 'gift-card'];
const STATUSES = ['AWAITING_FULFILLMENT', 'ON_HOLD', 'AWAITING_SHIPMENT', 'SHIPPED', 'COMPLETED'];
const laravel422 = (errors) => ({ message: Object.values(errors)[0][0], errors });
const page = (rows) => ({ current_page: 1, data: rows, total: rows.length, per_page: 15 });

const notExpired = (mmYyyy) => {
  const m = /^(\d{2})\/(\d{4})$/.exec(mmYyyy ?? '');
  return m !== null && new Date(Number(m[2]), Number(m[1]), 0) > new Date();
};

const PAYMENT_RULES = {
  'bank-transfer': {
    bank_name: (v) => /^[a-zA-Z ]+$/.test(v ?? ''),
    account_name: (v) => /^[a-zA-Z0-9 .'-]+$/.test(v ?? ''),
    account_number: (v) => /^\d+$/.test(v ?? ''),
  },
  'credit-card': {
    credit_card_number: (v) => /^\d{4}-\d{4}-\d{4}-\d{4}$/.test(v ?? ''),
    expiration_date: notExpired,
    cvv: (v) => /^\d{3,4}$/.test(v ?? ''),
    card_holder_name: (v) => /^[a-zA-Z ]+$/.test(v ?? ''),
  },
  'buy-now-pay-later': { monthly_installments: (v) => v !== undefined && !Number.isNaN(Number(v)) },
};

const paymentErrors = (method, details = {}) => {
  const errors = {};
  for (const [field, ok] of Object.entries(PAYMENT_RULES[method] ?? {}))
    if (!ok(details[field]))
      errors[`payment_details.${field}`] = [`The payment details.${field} field is invalid.`];
  return errors;
};

// StoreInvoice is a form request: the flat field -> messages shape.
const checkoutErrors = (body) => {
  const errors = {};
  if (!METHODS.includes(body.payment_method))
    errors.payment_method = ['The selected payment method is invalid.'];
  if (!('payment_details' in body)) errors.payment_details = ['The payment details field must be present.'];
  for (const f of ['billing_street', 'billing_city', 'billing_country', 'cart_id'])
    if (!body[f]) errors[f] = [`The ${f.replace('_', ' ')} field is required.`];
  return errors;
};

const BILLING = ['billing_street', 'billing_city', 'billing_state', 'billing_country', 'billing_postal_code'];

const place = (body, userId) => {
  const cart = carts.get(body.cart_id);
  if (!cart) return undefined;
  const lines = [...cart.items.values()].map((item) => {
    const p = products.get(item.product_id);
    return {
      id: newId(),
      product_id: item.product_id,
      unit_price: Number(p.price),
      quantity: item.quantity,
      discount_percentage: null,
      discounted_price: null,
    };
  });
  const subtotal = Math.round(lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0) * 100) / 100;
  const invoice = {
    id: newId(),
    invoice_number: `INV-${String(new Date().getFullYear())}${String(Math.floor(Math.random() * 1e10)).padStart(10, '0')}`,
    invoice_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    ...Object.fromEntries(BILLING.filter((f) => f in body).map((f) => [f, body[f]])),
    subtotal,
    total: subtotal,
    user_id: userId,
    status: 'AWAITING_FULFILLMENT',
    status_message: null,
    payment_method: body.payment_method,
    lines,
  };
  invoices.set(invoice.id, invoice);
  return invoice;
};

const summary = (i) =>
  Object.fromEntries(Object.entries(i).filter(([k]) => k !== 'lines' && k !== 'payment_method'));
const detail = (i) => ({
  ...summary(i),
  invoicelines: i.lines.map((l) => {
    const p = products.get(l.product_id);
    return { ...l, product: p ? { id: p.id, name: p.name, price: Number(p.price) } : null };
  }),
  payment: { payment_method: i.payment_method },
});

export const isInvoiced = (productId) =>
  [...invoices.values()].some((i) => i.lines.some((l) => l.product_id === productId));
export const hasInvoices = (userId) => [...invoices.values()].some((i) => i.user_id === userId);

export const handleCheckout = (ctx) => {
  const { req, res, parts, body, url } = ctx;

  if (parts[0] === 'payment' && parts[1] === 'check' && req.method === 'POST') {
    const errors = paymentErrors(body.payment_method, body.payment_details);
    if (Object.keys(errors).length > 0) return (send(res, 422, laravel422(errors)), true);
    return (send(res, 200, { message: 'Payment was successful' }), true);
  }
  if (parts[0] !== 'invoices') return false;

  if (parts[1] === 'guest' && req.method === 'POST') {
    const errors = checkoutErrors(body);
    for (const f of ['guest_email', 'guest_first_name', 'guest_last_name'])
      if (!body[f]) errors[f] = [`The ${f.replaceAll('_', ' ')} field is required.`];
    if (Object.keys(errors).length > 0) return (send(res, 422, laravel422(errors)), true);
    const invoice = place(body, null);
    return (invoice ? send(res, 201, summary(invoice)) : send(res, 404, NOT_FOUND), true);
  }

  if (!requireRole(ctx, 'any')) return true;
  const { userId, role } = sessionOf(req);
  const isAdmin = role === 'admin';
  const visible = (i) => isAdmin || i.user_id === userId;

  if (parts.length === 1 && req.method === 'POST') {
    const errors = checkoutErrors(body);
    if (Object.keys(errors).length > 0) return (send(res, 422, errors), true);
    const invoice = place(body, userId);
    return (invoice ? send(res, 201, summary(invoice)) : send(res, 404, NOT_FOUND), true);
  }
  if (parts.length === 1 && req.method === 'GET')
    return (send(res, 200, page([...invoices.values()].filter(visible).map(summary))), true);
  if (parts[1] === 'search' && req.method === 'GET') {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const hit = (i) =>
      [i.invoice_number, i.billing_street, i.status].some((v) => (v ?? '').toLowerCase().includes(q));
    return (
      send(res, 200, page([...invoices.values()].filter((i) => visible(i) && hit(i)).map(summary))),
      true
    );
  }
  if (parts[2] === 'download-pdf-status') return (send(res, 400, { status: 'NOT_INITIATED' }), true);
  if (parts[2] === 'download-pdf')
    return (send(res, 404, { message: 'Document not created. Try again later.' }), true);

  const invoice = invoices.get(parts[1]);
  if (parts[2] === 'status' && req.method === 'PUT') {
    if (!STATUSES.includes(body.status))
      return (send(res, 422, laravel422({ status: ['The selected status is invalid.'] })), true);
    // Mirrors known bug #19: no ownership or role check on the status update.
    if (!invoice) return (send(res, 404, { message: 'Invoice not found' }), true);
    invoice.status = body.status;
    invoice.status_message = body.status_message ?? null;
    return (send(res, 200, { success: true }), true);
  }
  if (parts.length !== 2) return false;
  if (req.method === 'GET')
    return (invoice && visible(invoice) ? send(res, 200, detail(invoice)) : send(res, 404, NOT_FOUND), true);
  if (req.method === 'PUT' || req.method === 'PATCH') {
    if (req.method === 'PUT') {
      const errors = checkoutErrors(body);
      if (Object.keys(errors).length > 0) return (send(res, 422, errors), true);
    }
    // PUT and PATCH only ever touch the caller's own invoices, admins included.
    if (!invoice || invoice.user_id !== userId) return (send(res, 404, NOT_FOUND), true);
    for (const f of BILLING) if (f in body) invoice[f] = body[f];
    return (send(res, 200, { success: true }), true);
  }
  return false;
};
