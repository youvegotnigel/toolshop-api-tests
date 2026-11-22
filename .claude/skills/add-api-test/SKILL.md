---
name: add-api-test
description: 'Add Playwright API test coverage for a Toolshop endpoint from the OpenAPI spec, including zod schema, client method, builder, fixtures and a test.step-based spec. Use when asked to test, cover or automate an endpoint.'
---

# Add an API test

Follow AGENTS.md. Work one endpoint at a time; finish the loop before starting the next.

## 1. Understand the endpoint

1. `node scripts/spec-drift.mts --pull` downloads the spec to `openapi/toolshop.openapi.json` (git-ignored).
   Offline? Use the operation list in `openapi/operations.lock.json` plus the user's description, and say so.
2. For the operation, note: path and query params, request body schema, every documented response code,
   and `security` (no security = public; `apiAuth` = JWT; check AGENTS.md for role rules).
3. Decide the scenarios in business language. These become `test.step` names.

## 2. Build the pieces (reuse before you add)

| Need              | Where                              | Rule                                                                                        |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Response contract | `src/schemas/<resource>.schema.ts` | zod schema; export inferred types; no `any`                                                 |
| Test data         | `src/data/<resource>.builder.ts`   | faker + `testDataTag()` in a searchable field                                               |
| Endpoint call     | `src/clients/<resource>.client.ts` | extends `BaseClient`, explicit `Promise<APIResponse<T>>`, no asserts, reads send `NO_CACHE` |
| Client injection  | `src/fixtures/clients.fixtures.ts` | one fixture per role that needs it                                                          |
| Created records   | `src/fixtures/data.fixtures.ts`    | factory fixture that registers `cleanup.add(...)`                                           |

## 3. Write the spec

Path: `tests/<resource>/<resource>.<method>.spec.ts`. Template:

```ts
import { test, expect } from '../../src/fixtures';
import { BrandSchema } from '../../src/schemas/brand.schema';
import { HTTP } from '../../src/utils/http';

test.describe('GET /brands/{id}', { tag: ['@brands', '@get'] }, () => {
  test('a shopper can open a brand', async ({ brandsClient, createdBrand }) => {
    await test.step('Open the brand by its id', async () => {
      const res = await brandsClient.getById(createdBrand.id);

      expect(res.status()).toBe(HTTP.OK);
      expect(BrandSchema.parse(await res.json())).toEqual(createdBrand);
    });
  });
});
```

Step names are for a manager reading the report: who does what, in plain words, 2 to 6 flat steps.

## 4. Prove it

1. `npm run lint && npm run typecheck`
2. `npx playwright test tests/<resource>` against the public API, or `npm run test:stub` offline.
   If the stub lacks the endpoint, add the minimum behaviour to `stub/toolshop-stub.mjs` from the spec.
3. `npx playwright test tests/<resource> --repeat-each=3 --shuffle` to prove independence.
4. Run the `review-api-tests` skill on your diff and fix every blocking finding.
5. Open a PR using the template; list endpoints and scenarios.
