// Offline stand-in for the Toolshop API behaviour this framework tests. Used by TEST_ENV=stub:
// local work without network, AI agents in sandboxes, and CI when no secrets are configured.
// Behaviour is modelled on the public contract and observed responses; it contains no Toolshop source code.
// One module per resource in ./resources; each handler returns true once it has answered.
import http from 'node:http';
import { send } from './lib.mjs';
import { handleBrands } from './resources/brands.mjs';
import { handleCategories } from './resources/categories.mjs';
import { handleProducts } from './resources/products.mjs';
import { handleUsers } from './resources/users.mjs';

const PORT = Number(process.env.STUB_PORT ?? 8091);
const HANDLERS = [handleUsers, handleBrands, handleCategories, handleProducts];

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  if (!raw) return {};
  if (!(req.headers['content-type'] ?? '').includes('application/json')) throw new Error('Unsupported body');
  return JSON.parse(raw);
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://stub');
    let body;
    try {
      body = await readBody(req);
    } catch (error) {
      return send(res, 400, { message: String(error) });
    }
    if (url.pathname === '/status')
      return send(res, 200, { version: 'stub-5.0.0', environment: 'stub', app_name: 'Toolshop stub' });

    const ctx = { req, res, url, body, parts: url.pathname.split('/').filter(Boolean) };
    for (const handle of HANDLERS) if (handle(ctx)) return;
    send(res, 404, { message: 'Resource not found' });
  })
  .listen(PORT, () => {
    console.log(`Toolshop stub listening on http://localhost:${PORT}`);
  });
