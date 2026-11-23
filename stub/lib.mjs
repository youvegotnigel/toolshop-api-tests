// Shared helpers for the offline Toolshop stub. Behaviour is modelled on the public contract and
// observed responses; this directory contains no Toolshop source code.
import { randomBytes } from 'node:crypto';

export const TTL_SECONDS = Number(process.env.STUB_JWT_TTL ?? 300);
export const CACHE = { 'Cache-Control': 'max-age=120, public' };
export const NOT_FOUND = { message: 'Requested item not found' };

/** email -> user; the admin is seeded, customers come from POST /users/register. */
export const USERS = new Map([
  [
    'admin@practicesoftwaretesting.com',
    { id: 'ADMIN', password: 'stub-password', role: 'admin', first_name: 'Admin', last_name: 'Stub' },
  ],
]);
/** token -> { userId, role, expiresAt } */
export const TOKENS = new Map();

export const newId = () => `01${randomBytes(12).toString('hex').toUpperCase()}`.slice(0, 26);

export const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(body === undefined ? '' : JSON.stringify(body));
};

export const sessionOf = (req) => {
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const entry = TOKENS.get(token);
  return entry && entry.expiresAt > Date.now() ? entry : undefined;
};

/** Sends 401/403 and returns false when the caller lacks the role; `any` means any logged-in user. */
export const requireRole = (ctx, role) => {
  const session = sessionOf(ctx.req);
  if (!session) return (send(ctx.res, 401, { message: 'Unauthorized' }), false);
  if (role !== 'any' && session.role !== role) return (send(ctx.res, 403, { message: 'Forbidden' }), false);
  return true;
};

const SLUG = /^[A-Za-z0-9_-]+$/;

/**
 * name + slug validation shared by brands and categories. Returns undefined when valid,
 * 409 when the only problem is a taken slug, otherwise 422 with a field -> messages body.
 */
export const validateNamed = (body, { partial, unique, selfId, store, label }) => {
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
      [...store.values()].some((r) => r.slug === value && r.id !== selfId)
    ) {
      errors.slug = [`A ${label} already exists with this slug.`];
    }
  }
  if (Object.keys(errors).length === 0) return undefined;
  return { status: onlyUnique ? 409 : 422, errors };
};

/** Name search: case-insensitive "contains", which is how the full-text search behaves for single words. */
export const nameMatches = (record, q) => record.name.toLowerCase().includes(q.toLowerCase());
