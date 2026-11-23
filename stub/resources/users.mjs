import { randomBytes } from 'node:crypto';
import { NOT_FOUND, TOKENS, TTL_SECONDS, USERS, newId, requireRole, send } from '../lib.mjs';

const publicUser = ({ id, first_name, last_name, email }) => ({ id, first_name, last_name, email });

export const handleUsers = (ctx) => {
  const { req, res, parts, body, url } = ctx;
  if (parts[0] !== 'users') return false;

  if (parts[1] === 'login' && req.method === 'POST') {
    const user = USERS.get(body.email);
    if (!user || user.password !== body.password) return (send(res, 401, { error: 'Unauthorized' }), true);
    const token = randomBytes(24).toString('base64url');
    TOKENS.set(token, { userId: user.id, role: user.role, expiresAt: Date.now() + TTL_SECONDS * 1000 });
    return (send(res, 200, { access_token: token, token_type: 'bearer', expires_in: TTL_SECONDS }), true);
  }

  if (parts[1] === 'register' && req.method === 'POST') {
    const missing = ['first_name', 'last_name', 'email', 'password'].filter((f) => !body[f]);
    if (missing.length > 0)
      return (
        send(res, 422, Object.fromEntries(missing.map((f) => [f, [`The ${f} field is required.`]]))),
        true
      );
    if (USERS.has(body.email))
      return (send(res, 409, { email: ['A customer with this email address already exists.'] }), true);
    const user = { ...body, id: newId(), role: 'user' };
    USERS.set(user.email, user);
    return (send(res, 201, publicUser(user)), true);
  }

  if (!requireRole(ctx, 'admin')) return true;
  if (parts[1] === 'search' && req.method === 'GET') {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const data = [...USERS.values()]
      .filter(
        (u) => u.role === 'user' && `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q),
      )
      .map(publicUser);
    return (send(res, 200, { current_page: 1, data, total: data.length }), true);
  }
  if (parts.length === 2 && req.method === 'DELETE') {
    const user = [...USERS.values()].find((u) => u.id === parts[1]);
    if (!user) return (send(res, 404, NOT_FOUND), true);
    USERS.delete(user.email);
    return (send(res, 204), true);
  }
  return false;
};
