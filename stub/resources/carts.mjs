import { carts, products } from '../store.mjs';
import { NOT_FOUND, newId, send } from '../lib.mjs';

// Inline validation: Laravel's default 422 shape.
const lineErrors = (body) => {
  const errors = {};
  if (typeof body.product_id !== 'string' || !products.has(body.product_id))
    errors.product_id = ['The selected product id is invalid.'];
  if (!Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 99)
    errors.quantity = ['The quantity field must be between 1 and 99.'];
  return Object.keys(errors).length === 0 ? undefined : { message: Object.values(errors)[0][0], errors };
};

const view = (cart) => ({
  id: cart.id,
  additional_discount_percentage: null,
  lat: cart.lat ?? null,
  lng: cart.lng ?? null,
  cart_items: [...cart.items.values()].map((item) => {
    const p = products.get(item.product_id);
    return {
      id: item.id,
      cart_id: cart.id,
      product_id: item.product_id,
      quantity: item.quantity,
      discount_percentage: null,
      product: p ? { id: p.id, name: p.name, price: Number(p.price) } : null,
    };
  }),
});

export const handleCarts = (ctx) => {
  const { req, res, parts, body } = ctx;
  if (parts[0] !== 'carts') return false;

  if (parts.length === 1 && req.method === 'POST') {
    const cart = { id: newId(), lat: body.lat, lng: body.lng, items: new Map() };
    carts.set(cart.id, cart);
    return (send(res, 201, { id: cart.id }), true);
  }
  const cart = carts.get(parts[1]);

  if (parts.length === 2 && req.method === 'POST') {
    const invalid = lineErrors(body);
    if (invalid) return (send(res, 422, invalid), true);
    if (!cart) return (send(res, 404, { message: 'Cart not found' }), true);
    const item = cart.items.get(body.product_id) ?? { id: newId(), product_id: body.product_id, quantity: 0 };
    item.quantity += body.quantity; // adding again adds up
    cart.items.set(body.product_id, item);
    return (send(res, 200, { result: 'item added or updated' }), true);
  }
  if (parts.length === 2 && req.method === 'GET')
    return (cart ? send(res, 200, view(cart)) : send(res, 404, NOT_FOUND), true);
  if (parts[2] === 'product' && parts[3] === 'quantity' && req.method === 'PUT') {
    const invalid = lineErrors(body);
    if (invalid) return (send(res, 422, invalid), true);
    if (!cart) return (send(res, 404, { message: "Cart doesn't exist" }), true);
    const item = cart.items.get(body.product_id);
    if (item) item.quantity = body.quantity; // setting replaces
    return (send(res, 200, { result: 'item added or updated' }), true);
  }
  if (req.method === 'DELETE') {
    if (!cart) return (send(res, 404, { message: 'Cart doesnt exists' }), true);
    if (parts[2] === 'product' && parts[3]) cart.items.delete(parts[3]);
    else if (parts.length === 2) carts.delete(cart.id);
    else return false;
    return (send(res, 204), true);
  }
  return false;
};
