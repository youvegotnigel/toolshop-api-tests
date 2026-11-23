import { CACHE, NOT_FOUND, nameMatches, newId, requireRole, send, validateNamed } from '../lib.mjs';

export const categories = new Map();
const rules = { store: categories, label: 'category' };

const withChildren = (category) => ({
  ...category,
  sub_categories: [...categories.values()].filter((c) => c.parent_id === category.id).map(withChildren),
});

export const handleCategories = (ctx) => {
  const { req, res, parts, body, url } = ctx;
  if (parts[0] !== 'categories') return false;
  const all = [...categories.values()];

  if (req.method === 'GET') {
    if (parts.length === 1) return (send(res, 200, all, CACHE), true);
    if (parts[1] === 'tree' && parts.length === 2) {
      const slug = url.searchParams.get('by_category_slug');
      const roots = all.filter((c) => c.parent_id === null && (slug === null || c.slug === slug));
      return (send(res, 200, roots.map(withChildren), CACHE), true);
    }
    if (parts[1] === 'tree' && parts.length === 3) {
      const category = categories.get(parts[2]);
      return (category ? send(res, 200, withChildren(category), CACHE) : send(res, 404, NOT_FOUND), true);
    }
    if (parts[1] === 'search') {
      const q = url.searchParams.get('q') ?? '';
      return (send(res, 200, all.filter((c) => nameMatches(c, q)).map(withChildren), CACHE), true);
    }
    return false;
  }

  if (parts.length === 1 && req.method === 'POST') {
    const invalid = validateNamed(body, { ...rules, partial: false, unique: true });
    if (invalid) return (send(res, invalid.status, invalid.errors), true);
    const category = { id: newId(), name: body.name, slug: body.slug, parent_id: body.parent_id ?? null };
    categories.set(category.id, category);
    return (send(res, 201, category), true);
  }

  if (req.method === 'DELETE' && !requireRole(ctx, 'admin')) return true;
  const category = categories.get(parts[1]);
  if (!category) return (send(res, 404, NOT_FOUND), true);

  switch (req.method) {
    case 'PUT':
    case 'PATCH': {
      const opts = { ...rules, partial: true, unique: req.method === 'PATCH', selfId: category.id };
      const invalid = validateNamed(body, opts);
      if (invalid) return (send(res, invalid.status, invalid.errors), true);
      const { name = category.name, slug = category.slug, parent_id = category.parent_id } = body;
      categories.set(category.id, { ...category, name, slug, parent_id });
      return (send(res, 200, { success: true }), true);
    }
    case 'DELETE':
      if (all.some((c) => c.parent_id === category.id))
        return (
          send(res, 409, { success: false, message: 'Seems like this category is used elsewhere.' }),
          true
        );
      categories.delete(category.id);
      return (send(res, 204), true);
    default:
      return false;
  }
};
