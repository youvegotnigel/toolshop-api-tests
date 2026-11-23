import { brands, categories, images, products, specs } from '../store.mjs';
import { CACHE, NOT_FOUND, nameMatches, newId, requireRole, send } from '../lib.mjs';

const PAGE_SIZE = 9;
const page = (rows, n = 1) => ({
  current_page: n,
  data: rows.slice((n - 1) * PAGE_SIZE, n * PAGE_SIZE),
  total: rows.length,
  per_page: PAGE_SIZE,
});
const truthy = (v) => ['1', 'true'].includes(String(v).toLowerCase());
const isNumeric = (v) =>
  typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)));

const specsOf = (productId) => [...specs.values()].filter((s) => s.product_id === productId);
const view = (p) => {
  const brand = brands.get(p.brand_id);
  const category = categories.get(p.category_id);
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    price: Number(p.price),
    is_location_offer: p.is_location_offer,
    is_rental: p.is_rental,
    in_stock: false,
    co2_rating: null,
    is_eco_friendly: false,
    brand: brand ? { id: brand.id, name: brand.name } : null,
    category: category
      ? { id: category.id, name: category.name, slug: category.slug, parent_id: category.parent_id }
      : null,
    product_image: images.get(p.product_image_id) ?? null,
    specs: specsOf(p.id),
  };
};

const productErrors = (body, { partial }) => {
  const errors = {};
  const need = (field, ok, message) => {
    if (body[field] === undefined) {
      if (!partial) errors[field] = [`The ${field.replaceAll('_', ' ')} field is required.`];
    } else if (!ok(body[field])) errors[field] = [message];
  };
  need(
    'name',
    (v) => typeof v === 'string' && v.length > 0 && v.length <= 120,
    'The name field must be a string of at most 120 characters.',
  );
  need('price', isNumeric, 'The price field must be a number.');
  need('category_id', (v) => Boolean(v), 'The category id field is required.');
  need('brand_id', (v) => Boolean(v), 'The brand id field is required.');
  need(
    'is_location_offer',
    (v) => typeof v === 'boolean',
    'The is location offer field must be true or false.',
  );
  need('is_rental', (v) => typeof v === 'boolean', 'The is rental field must be true or false.');
  need('product_image_id', (v) => typeof v === 'string', 'The product image id field must be a string.');
  return errors;
};

const specErrors = (body, { partial }) => {
  const errors = {};
  for (const [field, max] of [
    ['spec_name', 100],
    ['spec_value', 255],
  ]) {
    const value = body[field];
    if (value === undefined && partial) continue;
    if (typeof value !== 'string' || value.length === 0)
      errors[field] = [`The ${field.replace('_', ' ')} field is required.`];
    else if (value.length > max)
      errors[field] = [`The ${field.replace('_', ' ')} field must not be greater than ${max} characters.`];
  }
  return errors;
};

// Specs validate inline, so their 422 is Laravel's default shape, not the flat field map.
const laravel422 = (errors) => ({ message: Object.values(errors)[0][0], errors });

const handleSpecs = (ctx, productId, specId) => {
  const { req, res, body } = ctx;
  if (req.method === 'GET' && specId === undefined) return (send(res, 200, specsOf(productId), CACHE), true);
  if (req.method === 'GET') {
    const spec = specs.get(specId);
    return (
      spec && spec.product_id === productId ? send(res, 200, spec, CACHE) : send(res, 404, NOT_FOUND),
      true
    );
  }
  if (!requireRole(ctx, 'any')) return true;
  if (req.method === 'POST' && specId === undefined) {
    const errors = specErrors(body, { partial: false });
    if (Object.keys(errors).length > 0) return (send(res, 422, laravel422(errors)), true);
    const spec = {
      id: newId(),
      product_id: productId,
      spec_name: body.spec_name,
      spec_value: body.spec_value,
      spec_unit: body.spec_unit ?? null,
    };
    specs.set(spec.id, spec);
    return (send(res, 201, spec), true);
  }
  const spec = specs.get(specId);
  const mine = spec && spec.product_id === productId;
  if (req.method === 'PUT') {
    const errors = specErrors(body, { partial: true });
    if (Object.keys(errors).length > 0) return (send(res, 422, laravel422(errors)), true);
    if (!mine) return (send(res, 404, NOT_FOUND), true);
    for (const f of ['spec_name', 'spec_value', 'spec_unit']) if (f in body) spec[f] = body[f];
    return (send(res, 200, { success: true }), true);
  }
  if (req.method === 'DELETE') {
    if (mine) specs.delete(specId);
    return (send(res, 204), true); // the API answers 204 even when nothing matched
  }
  return false;
};

export const handleProducts = (ctx) => {
  const { req, res, parts, body, url } = ctx;

  if (parts[0] === 'images' && parts.length === 1 && req.method === 'GET')
    return (send(res, 200, [...images.values()], CACHE), true);

  if (parts[0] === 'product-specs' && parts[1] === 'names' && req.method === 'GET') {
    const byName = new Map();
    for (const s of specs.values()) {
      const entry = byName.get(s.spec_name) ?? { name: s.spec_name, values: [], unit: s.spec_unit };
      if (!entry.values.includes(s.spec_value)) entry.values.push(s.spec_value);
      byName.set(s.spec_name, entry);
    }
    return (
      send(
        res,
        200,
        [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)),
        CACHE,
      ),
      true
    );
  }

  if (parts[0] !== 'products') return false;
  const all = [...products.values()];

  if (parts.length === 1 && req.method === 'GET') {
    const rental = truthy(url.searchParams.get('is_rental') ?? '0');
    const slug = url.searchParams.get('by_category_slug');
    const inCategory = (p) => {
      if (!slug) return true;
      const c = categories.get(p.category_id);
      const parent = c?.parent_id ? categories.get(c.parent_id) : undefined;
      return c?.slug === slug || parent?.slug === slug;
    };
    const brand = url.searchParams.get('by_brand');
    const rows = all.filter(
      (p) => p.is_rental === rental && inCategory(p) && (!brand || p.brand_id === brand),
    );
    return (send(res, 200, page(rows.map(view), Number(url.searchParams.get('page') ?? 1)), CACHE), true);
  }
  if (parts[1] === 'search' && req.method === 'GET') {
    const q = url.searchParams.get('q') ?? '';
    return (send(res, 200, page(q ? all.filter((p) => nameMatches(p, q)).map(view) : []), CACHE), true);
  }
  if (parts.length === 1 && req.method === 'POST') {
    const errors = productErrors(body, { partial: false });
    if (Object.keys(errors).length > 0) return (send(res, 422, errors), true);
    const product = { ...body, id: newId(), price: Number(body.price) };
    products.set(product.id, product);
    return (send(res, 201, view(product)), true);
  }

  if (parts[2] === 'specs') return handleSpecs(ctx, parts[1], parts[3]);

  if (req.method === 'DELETE' && !requireRole(ctx, 'admin')) return true;
  const product = products.get(parts[1]);
  if (!product) return (send(res, 404, NOT_FOUND), true);

  if (parts[2] === 'related' && req.method === 'GET') {
    const related = all
      .filter((p) => p.category_id === product.category_id && p.id !== product.id)
      .slice(0, 10);
    return (send(res, 200, related.map(view), CACHE), true);
  }
  if (parts.length !== 2) return false;

  switch (req.method) {
    case 'GET':
      return (send(res, 200, view(product), CACHE), true);
    case 'PUT':
    case 'PATCH': {
      const errors = productErrors(body, { partial: true });
      if (req.method === 'PUT') delete errors.price; // PUT does not validate the price
      if (Object.keys(errors).length > 0) return (send(res, 422, errors), true);
      Object.assign(product, body, 'price' in body ? { price: Number(body.price) } : {});
      return (send(res, 200, { success: true }), true);
    }
    case 'DELETE':
      products.delete(product.id);
      for (const s of specsOf(product.id)) specs.delete(s.id); // specs cascade with their product
      return (send(res, 204), true);
    default:
      return false;
  }
};
