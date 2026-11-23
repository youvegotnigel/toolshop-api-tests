import { CACHE, NOT_FOUND, nameMatches, newId, requireRole, send, validateNamed } from '../lib.mjs';

export const brands = new Map();
const rules = { store: brands, label: 'brand' };

export const handleBrands = (ctx) => {
  const { req, res, parts, body, url } = ctx;
  if (parts[0] !== 'brands') return false;

  if (parts.length === 1 && req.method === 'GET') return (send(res, 200, [...brands.values()], CACHE), true);
  if (parts[1] === 'search' && req.method === 'GET') {
    const q = url.searchParams.get('q') ?? '';
    return (
      send(
        res,
        200,
        [...brands.values()].filter((b) => nameMatches(b, q)),
        CACHE,
      ),
      true
    );
  }
  if (parts.length === 1 && req.method === 'POST') {
    const invalid = validateNamed(body, { ...rules, partial: false, unique: true });
    if (invalid) return (send(res, invalid.status, invalid.errors), true);
    const brand = { id: newId(), name: body.name, slug: body.slug };
    brands.set(brand.id, brand);
    return (send(res, 201, brand), true);
  }

  if (req.method === 'DELETE' && !requireRole(ctx, 'admin')) return true;
  const brand = brands.get(parts[1]);
  if (!brand) return (send(res, 404, NOT_FOUND), true);

  switch (req.method) {
    case 'GET':
      return (send(res, 200, brand, CACHE), true);
    case 'PUT':
    case 'PATCH': {
      const invalid = validateNamed(body, {
        ...rules,
        partial: true,
        unique: req.method === 'PATCH',
        selfId: brand.id,
      });
      if (invalid) return (send(res, invalid.status, invalid.errors), true);
      const { name = brand.name, slug = brand.slug } = body;
      brands.set(brand.id, { ...brand, name, slug });
      return (send(res, 200, { success: true }), true);
    }
    case 'DELETE':
      brands.delete(brand.id);
      return (send(res, 204), true);
    default:
      return false;
  }
};
