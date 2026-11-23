import { messages } from '../store.mjs';
import { newId, requireRole, send, sessionOf } from '../lib.mjs';

const STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED'];
const page = (rows) => ({ current_page: 1, data: rows, total: rows.length, per_page: 15 });
const record = (m) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== 'replies'));

export const handleMessages = (ctx) => {
  const { req, res, parts, body } = ctx;
  if (parts[0] !== 'messages') return false;

  if (parts.length === 1 && req.method === 'POST') {
    const errors = {};
    if (!body.subject) errors.subject = ['The subject field is required.'];
    if (!body.message) errors.message = ['The message field is required.'];
    else if (body.message.length > 250)
      errors.message = ['The message field must not be greater than 250 characters.'];
    if (Object.keys(errors).length > 0) return (send(res, 422, errors), true);
    const message = {
      id: newId(),
      name: body.name ?? null,
      email: body.email ?? null,
      subject: body.subject,
      message: body.message,
      status: 'NEW',
      user_id: sessionOf(req)?.userId ?? null,
      replies: [],
    };
    messages.set(message.id, message);
    return (send(res, 200, record(message)), true);
  }
  if (parts[2] === 'attach-file' && req.method === 'POST') {
    const file = body.file;
    const error = !file
      ? 'No file attached.'
      : file.size !== 0
        ? 'Currently we only allow empty files.'
        : !file.name.endsWith('.txt')
          ? 'The file extension is incorrect, we only accept txt files.'
          : undefined;
    return (error ? send(res, 400, { errors: [error] }) : send(res, 200, { success: true }), true);
  }

  if (!requireRole(ctx, 'any')) return true;
  const { userId, role } = sessionOf(req);
  const visible = (m) => role === 'admin' || m.user_id === userId;

  if (parts.length === 1 && req.method === 'GET')
    return (send(res, 200, page([...messages.values()].filter(visible).map(record))), true);
  const message = messages.get(parts[1]);
  if (parts.length === 2 && req.method === 'GET')
    return (send(res, 200, message && visible(message) ? message : null), true);
  // Mirrors known bug #22: reply and status have no ownership check.
  if (parts[2] === 'reply' && req.method === 'POST') {
    if (!body.message) return (send(res, 422, { message: ['The message field is required.'] }), true);
    const reply = { id: newId(), message: body.message, user_id: userId };
    if (message) {
      message.replies.push(reply);
      message.status = 'IN_PROGRESS';
    }
    return (send(res, 201, reply), true);
  }
  if (parts[2] === 'status' && req.method === 'PUT') {
    if (!STATUSES.includes(body.status))
      return (
        send(res, 422, {
          message: 'The selected status is invalid.',
          errors: { status: ['The selected status is invalid.'] },
        }),
        true
      );
    if (message) message.status = body.status;
    return (send(res, 200, { success: true }), true);
  }
  return false;
};
