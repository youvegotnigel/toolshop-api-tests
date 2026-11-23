import { favorites, products } from '../store.mjs';
import { NOT_FOUND, newId, requireRole, send, sessionOf } from '../lib.mjs';

export const isFavorited = (productId) => [...favorites.values()].some((f) => f.product_id === productId);

export const handleFavorites = (ctx) => {
  const { req, res, parts, body } = ctx;
  if (parts[0] !== 'favorites') return false;
  if (!requireRole(ctx, 'any')) return true;
  const { userId } = sessionOf(req);

  if (parts.length === 1 && req.method === 'POST') {
    if (typeof body.product_id !== 'string' || !products.has(body.product_id))
      return (send(res, 422, { product_id: ['The selected product id is invalid.'] }), true);
    const favorite = { id: newId(), user_id: userId, product_id: body.product_id };
    favorites.set(favorite.id, favorite);
    return (send(res, 201, favorite), true);
  }
  if (parts.length === 1 && req.method === 'GET') {
    const mine = [...favorites.values()].filter((f) => f.user_id === userId);
    return (
      send(
        res,
        200,
        mine.map((f) => {
          const p = products.get(f.product_id);
          return { ...f, product: p ? { id: p.id, name: p.name, price: Number(p.price) } : null };
        }),
      ),
      true
    );
  }
  const favorite = favorites.get(parts[1]);
  // Mirrors known bug #21: reading one favorite has no ownership check.
  if (req.method === 'GET') return (favorite ? send(res, 200, favorite) : send(res, 404, NOT_FOUND), true);
  if (req.method === 'DELETE') {
    if (favorite?.user_id === userId) favorites.delete(favorite.id);
    return (send(res, 204), true); // 204 even when nothing of the caller's was deleted
  }
  return false;
};
