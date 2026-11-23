import { randomBytes } from 'node:crypto';
import { NOT_FOUND, TOKENS, TTL_SECONDS, USERS, newId, requireRole, send, sessionOf } from '../lib.mjs';

const MAX_FAILED_LOGINS = 3;
const ADDRESS_FIELDS = ['street', 'house_number', 'city', 'state', 'country', 'postal_code'];
const PHONE = /^\+?[0-9\s().-]{7,24}$/;
const STRONG = (p) =>
  typeof p === 'string' &&
  p.length >= 8 &&
  /[a-z]/.test(p) &&
  /[A-Z]/.test(p) &&
  /\d/.test(p) &&
  /[^A-Za-z0-9]/.test(p);
const page = (data) => ({ current_page: 1, data, total: data.length, per_page: 15 });

const fullUser = (u) => ({
  id: u.id,
  first_name: u.first_name,
  last_name: u.last_name,
  email: u.email,
  phone: u.phone ?? null,
  dob: u.dob ?? null,
  address: Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, u.address?.[f] ?? null])),
});
const byId = (id) => [...USERS.values()].find((u) => u.id === id);
const issueToken = (user) => {
  const token = randomBytes(24).toString('base64url');
  TOKENS.set(token, { userId: user.id, role: user.role, expiresAt: Date.now() + TTL_SECONDS * 1000 });
  return { access_token: token, token_type: 'bearer', expires_in: TTL_SECONDS };
};
const tokenOf = (req) => (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
const isAdult = (dob) => {
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 18);
  return /^\d{4}-\d{2}-\d{2}$/.test(dob) && new Date(dob) < limit;
};

const registrationErrors = (body) => {
  const errors = {};
  for (const f of ['first_name', 'last_name', 'email', 'password'])
    if (!body[f]) errors[f] = [`The ${f} field is required.`];
  if (body.password && !STRONG(body.password)) errors.password = ['The password field must be stronger.'];
  if (body.dob !== undefined && !isAdult(body.dob)) errors.dob = ['Customer must be 18 years old.'];
  return errors;
};

const applyProfile = (user, body) => {
  const { address, ...rest } = body;
  for (const f of ['first_name', 'last_name', 'email', 'phone', 'dob']) if (f in rest) user[f] = rest[f];
  if (address) user.address = { ...user.address, ...address };
};

export const handleUsers = (ctx) => {
  const { req, res, parts, body, url } = ctx;
  if (parts[0] !== 'users') return false;
  const action = parts[1];

  if (action === 'login' && req.method === 'POST') {
    const user = USERS.get(body.email);
    if (user && user.role !== 'admin' && (user.failed ?? 0) >= MAX_FAILED_LOGINS)
      return (
        send(res, 423, {
          error: 'Account locked, too many failed attempts. Please contact the administrator.',
        }),
        true
      );
    if (!user || user.password !== body.password) {
      if (user && user.role !== 'admin') user.failed = (user.failed ?? 0) + 1;
      return (send(res, 401, { error: 'Unauthorized' }), true);
    }
    user.failed = 0;
    return (send(res, 200, issueToken(user)), true);
  }

  if (action === 'register' && req.method === 'POST') {
    const errors = registrationErrors(body);
    if (Object.keys(errors).length > 0) return (send(res, 422, errors), true);
    if (USERS.has(body.email))
      return (send(res, 409, { email: ['A customer with this email address already exists.'] }), true);
    // role is always "user", whatever was sent
    const profile = Object.fromEntries(
      Object.entries(body).filter(([k]) => k !== 'password' && k !== 'role'),
    );
    const user = { ...profile, password: body.password, id: newId(), role: 'user' };
    USERS.set(user.email, user);
    return (send(res, 201, { ...profile, id: user.id }), true);
  }

  // Everything below needs a login.
  if (!requireRole(ctx, 'any')) return true;
  const session = sessionOf(req);
  const isAdmin = session.role === 'admin';

  if (action === 'me' && req.method === 'GET') return (send(res, 200, fullUser(byId(session.userId))), true);
  if (action === 'logout' && req.method === 'GET') {
    TOKENS.delete(tokenOf(req));
    return (send(res, 200, { message: 'Successfully logged out' }), true);
  }
  if (action === 'refresh' && req.method === 'GET') {
    TOKENS.delete(tokenOf(req));
    return (send(res, 200, issueToken(byId(session.userId))), true);
  }
  if (action === 'search' && req.method === 'GET') {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const found = [...USERS.values()].filter(
      (u) => u.role === 'user' && `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q),
    );
    return (send(res, 200, page(found.map(fullUser))), true);
  }
  if (parts.length === 1 && req.method === 'GET') {
    if (!requireRole(ctx, 'admin')) return true;
    return (send(res, 200, page([...USERS.values()].filter((u) => u.role === 'user').map(fullUser))), true);
  }

  if (parts.length !== 2) return false;
  if (req.method === 'DELETE' && !requireRole(ctx, 'admin')) return true;
  const user = byId(action);
  const self = session.userId === action;

  switch (req.method) {
    case 'GET':
      if (!isAdmin && !self)
        return (send(res, 404, { error: 'You are not authorized to view this user.' }), true);
      return (user ? send(res, 200, fullUser(user)) : send(res, 404, NOT_FOUND), true);
    case 'PUT':
    case 'PATCH': {
      if (req.method === 'PATCH' && body.phone != null && !PHONE.test(body.phone))
        return (
          send(res, 422, {
            phone: ['Phone number may only contain digits, spaces and the characters ( ) + - .'],
          }),
          true
        );
      if (req.method === 'PUT') {
        const missing = ['first_name', 'last_name', 'email'].filter((f) => !body[f]);
        for (const f of ['street', 'city', 'country']) if (!body.address?.[f]) missing.push(`address.${f}`);
        if (missing.length > 0)
          return (
            send(res, 422, Object.fromEntries(missing.map((f) => [f, [`The ${f} field is required.`]]))),
            true
          );
      }
      if (!user) return (send(res, 404, NOT_FOUND), true);
      if (!isAdmin && !self) return (send(res, 403, { error: 'You can only update your own data.' }), true);
      applyProfile(user, body);
      return (send(res, 200, { success: true }), true);
    }
    case 'DELETE':
      if (!user) return (send(res, 404, NOT_FOUND), true);
      USERS.delete(user.email);
      for (const [token, entry] of TOKENS) if (entry.userId === user.id) TOKENS.delete(token);
      return (send(res, 204), true);
    default:
      return false;
  }
};
