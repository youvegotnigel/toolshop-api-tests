// Offline stand-in for the Toolshop /brands and /users/login behaviour this framework tests.
// Written from the public OpenAPI contract and observed responses; contains no Toolshop source code.
// Used by TEST_ENV=stub: local work without network, AI agents in sandboxes, and CI smoke checks.
import http from 'node:http';
import { randomBytes } from 'node:crypto';

const PORT = Number(process.env.STUB_PORT ?? 8091);
const TTL_SECONDS = Number(process.env.STUB_JWT_TTL ?? 300);
const USERS = {
  'admin@practicesoftwaretesting.com': { password: 'stub-password', role: 'admin' },
  'customer@practicesoftwaretesting.com': { password: 'stub-password', role: 'user' },
};
const SLUG = /^[A-Za-z0-9_-]+$/;
const brands = new Map();
const tokens = new Map();

const newId = () => `01${randomBytes(12).toString('hex').toUpperCase()}`.slice(0, 26);
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
const roleOf = (req) => {
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const entry = tokens.get(token);
  return entry && entry.expiresAt > Date.now() ? entry.role : undefined;
};
const validate = (body, { partial, unique, selfId }) => {
  const errors = {};
  let onlyUnique = true;
  for (const field of ['name', 'slug']) {
    const value = body[field];
    if (value === undefined) {
      if (!partial) {
        errors[field] = [`The ${field} field is required.`];
        onlyUnique = false;
      }
      continue;
    }
    if (typeof value !== 'string' || value.length === 0 || value.length > 120) {
      errors[field] = [`The ${field} field must be a string of at most 120 characters.`];
      onlyUnique = false;
    } else if (field === 'slug' && !SLUG.test(value)) {
      errors.slug = ['The slug field must only contain letters, numbers, dashes, and underscores.'];
      onlyUnique = false;
    } else if (
      field === 'slug' &&
      unique &&
      [...brands.values()].some((b) => b.slug === value && b.id !== selfId)
    ) {
      errors.slug = ['A brand already exists with this slug.'];
    }
  }
  if (Object.keys(errors).length === 0) return undefined;
  return { status: onlyUnique ? 409 : 422, errors };
};

http
  .createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    const url = new URL(req.url ?? '/', 'http://stub');
    const parts = url.pathname.split('/').filter(Boolean);
    let body = {};
    if (raw) {
      if (!(req.headers['content-type'] ?? '').includes('application/json'))
        return send(res, 422, { message: 'Unsupported body' });
      try {
        body = JSON.parse(raw);
      } catch {
        return send(res, 400, { message: 'Malformed JSON' });
      }
    }

    if (url.pathname === '/status')
      return send(res, 200, { version: 'stub-5.0.0', environment: 'stub', app_name: 'Toolshop stub' });

    if (url.pathname === '/users/login' && req.method === 'POST') {
      const user = USERS[body.email];
      if (!user || user.password !== body.password) return send(res, 401, { error: 'Unauthorized' });
      const token = randomBytes(24).toString('base64url');
      tokens.set(token, { role: user.role, expiresAt: Date.now() + TTL_SECONDS * 1000 });
      return send(res, 200, { access_token: token, token_type: 'bearer', expires_in: TTL_SECONDS });
    }

    if (parts[0] !== 'brands') return send(res, 404, { message: 'Resource not found' });
    const cache = { 'Cache-Control': 'max-age=120, public' };

    if (parts.length === 1 && req.method === 'GET') return send(res, 200, [...brands.values()], cache);
    if (parts.length === 2 && parts[1] === 'search' && req.method === 'GET') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      return send(
        res,
        200,
        [...brands.values()].filter((b) => b.name.toLowerCase().includes(q)),
        cache,
      );
    }
    if (parts.length === 1 && req.method === 'POST') {
      const invalid = validate(body, { partial: false, unique: true });
      if (invalid) return send(res, invalid.status, invalid.errors);
      const brand = { id: newId(), name: body.name, slug: body.slug };
      brands.set(brand.id, brand);
      return send(res, 201, brand);
    }

    const brand = parts.length === 2 ? brands.get(parts[1]) : undefined;
    if (req.method === 'DELETE') {
      const role = roleOf(req);
      if (!role) return send(res, 401, { message: 'Unauthorized' });
      if (role !== 'admin') return send(res, 403, { message: 'Forbidden' });
    }
    if (!brand) return send(res, 404, { message: 'Requested item not found' });

    switch (req.method) {
      case 'GET':
        return send(res, 200, brand, cache);
      case 'PUT':
      case 'PATCH': {
        const invalid = validate(body, { partial: true, unique: req.method === 'PATCH', selfId: brand.id });
        if (invalid) return send(res, invalid.status, invalid.errors);
        brands.set(brand.id, {
          ...brand,
          ...('name' in body ? { name: body.name } : {}),
          ...('slug' in body ? { slug: body.slug } : {}),
        });
        return send(res, 200, { success: true });
      }
      case 'DELETE':
        brands.delete(brand.id);
        return send(res, 204);
      default:
        return send(res, 405, { message: 'Method is not allowed for the requested route' });
    }
  })
  .listen(PORT, () => {
    console.log(`Toolshop stub listening on http://localhost:${PORT}`);
  });
