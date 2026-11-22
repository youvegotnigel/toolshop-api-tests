/**
 * Compares the live Toolshop OpenAPI operations with openapi/operations.lock.json.
 *   node scripts/spec-drift.mts            exit 1 when operations were added or removed
 *   node scripts/spec-drift.mts --update   refresh the lock file
 *   node scripts/spec-drift.mts --pull     only download the spec for agents to read
 *   --from <file>                          read a local spec instead of the live URL
 * The full spec is saved to openapi/toolshop.openapi.json, which is git-ignored:
 * Toolshop's licence does not allow redistributing it, so only the operation list is committed.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';

type Operation = { operationId?: string; summary?: string };
type Spec = { info?: { version?: string }; paths: Record<string, Record<string, Operation>> };
type Lock = { source: string; specVersion: string; operations: string[] };

const SPEC_URL = process.env.SPEC_URL ?? 'https://api.practicesoftwaretesting.com/docs/api-docs.json';
const LOCK_FILE = 'openapi/operations.lock.json';
const SPEC_FILE = 'openapi/toolshop.openapi.json';
const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'query']);

const args = process.argv.slice(2);
const fromIndex = args.indexOf('--from');
const fromFile = fromIndex === -1 ? undefined : args[fromIndex + 1];

const loadSpec = async (): Promise<Spec> => {
  if (fromFile !== undefined) return JSON.parse(await readFile(fromFile, 'utf8')) as Spec;
  const res = await fetch(SPEC_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Could not download ${SPEC_URL}: HTTP ${String(res.status)}`);
  return (await res.json()) as Spec;
};

const operationsOf = (spec: Spec): string[] =>
  Object.entries(spec.paths)
    .flatMap(([path, ops]) =>
      Object.keys(ops)
        .filter((method) => METHODS.has(method))
        .map((method) => `${method.toUpperCase()} ${path}`),
    )
    .sort();

const spec = await loadSpec();
await mkdir('openapi', { recursive: true });
await writeFile(SPEC_FILE, JSON.stringify(spec, null, 2));
const live = operationsOf(spec);

if (args.includes('--pull')) {
  console.log(`Saved ${SPEC_FILE} (${String(live.length)} operations)`);
} else if (args.includes('--update')) {
  const lock: Lock = { source: SPEC_URL, specVersion: spec.info?.version ?? 'unknown', operations: live };
  await writeFile(LOCK_FILE, `${JSON.stringify(lock, null, 2)}\n`);
  console.log(`Updated ${LOCK_FILE}: ${String(live.length)} operations`);
} else {
  const lock = JSON.parse(await readFile(LOCK_FILE, 'utf8')) as Lock;
  const added = live.filter((op) => !lock.operations.includes(op));
  const removed = lock.operations.filter((op) => !live.includes(op));
  if (added.length === 0 && removed.length === 0) {
    console.log(`No drift: ${String(live.length)} operations match ${LOCK_FILE}`);
  } else {
    added.forEach((op) => {
      console.log(`+ ${op}`);
    });
    removed.forEach((op) => {
      console.log(`- ${op}`);
    });
    console.log(`Drift: ${String(added.length)} added, ${String(removed.length)} removed`);
    process.exitCode = 1;
  }
}
