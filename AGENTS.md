# AGENTS.md

Single source of truth for every contributor: humans, Claude Code and GitHub Copilot.
`CLAUDE.md` and `.github/copilot-instructions.md` only point here. Change rules here, nowhere else.

## Project

Playwright + TypeScript API tests for the **Toolshop API** by Practice Software Testing
(`https://api.practicesoftwaretesting.com`, OpenAPI 3.2, JWT auth, roles `admin` and `user`).
Started with 5 tests, one per HTTP method on `/brands`; built to grow endpoint by endpoint.

## Commands

| Task                         | Command                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| Everything a PR needs        | `npm run verify`                                           |
| Tests against the public API | `npm test`                                                 |
| Tests offline (no network)   | `npm run test:stub`                                        |
| One tag                      | `npx playwright test --grep @smoke`                        |
| Prove tests are independent  | `npm run test:shuffle`                                     |
| Typecheck / lint / format    | `npm run typecheck`, `npm run lint`, `npm run format`      |
| Spec drift / download spec   | `npm run spec:check`, `node scripts/spec-drift.mts --pull` |
| Agent files in sync          | `node scripts/agent-parity.mts`                            |
| Dashboard + reports locally  | `npm run report:site` (after a run with `ALLURE=1`)        |

If your sandbox cannot reach `api.practicesoftwaretesting.com`, use `npm run test:stub` and say so in the PR.

## Architecture

```
playwright.config.ts      env loading, RUN_ID, reporters, projects (setup, api, teardown)
src/config/env.ts         .env.local + .env.<TEST_ENV>, env() fail-fast reader, runId()
src/auth/auth-session.ts  worker-scoped login per role, auto-renews the ~5 min JWT
src/clients/users.client  registers and removes the throwaway customer used by each worker
src/fixtures/             auth -> clients -> data, re-exported by src/fixtures/index.ts
src/clients/              one class per resource, endpoints only, typed APIResponse<T>
src/schemas/              zod contracts; TypeScript types are inferred from them
src/data/                 builders with faker; every record carries the run tag qa-<RUN_ID>
src/utils/                logger (redacts secrets), api-recorder (one call log per test), HTTP codes, NO_CACHE
src/reporting/            failure-tracker: failure-summary.json + GitHub job summary
scripts/coverage/         automation dashboard (pass rate, spec coverage, critical flows, trends)
scripts/ci/               report history restore, site build, GitHub Pages publish (gh-pages)
coverage.config.json      dashboard settings: target coverage and the critical operations list
tests/<resource>/         specs, one file per behaviour
tests/setup/              environment check (setup) and run-tag sweep (teardown)
stub/                     offline stand-in for TEST_ENV=stub: router + one module per resource in stub/resources/
```

Fixture graph: `adminSession`, `customerSession` (worker; registers its own customer) and `correlationId`, `apiRecorder`
(test; one per test, shared by every context) -> `api`, `adminApi`, `customerApi`
-> `brandsClient`, `adminBrandsClient`, `customerBrandsClient` -> `cleanup` -> `createBrand` -> `createdBrand`.

## Rules for every test (CI and ESLint enforce most of them)

1. Import `test` and `expect` from `src/fixtures`, never from `@playwright/test`.
2. Get clients, contexts and data from fixtures. No `request` or `playwright` fixture in specs, no other HTTP library.
3. Describe the flow with `test.step` in plain business language, 2 to 6 flat steps (no nesting).
   Managers read these in the HTML and Allure reports: "An admin deletes the brand", not "call DELETE".
4. One `test.describe` per file named after the endpoint (`'DELETE /brands/{id}'`), and tag every test
   with the resource and method (`@brands`, `@delete`); add `@smoke` only for critical paths.
   The describe title is also how the **automation dashboard** counts coverage. If a test exercises another
   operation too, declare it: `{ annotation: { type: 'covers', description: 'GET /brands/{id}' } }`.
   Tag scenario depth: `@negative` for error/validation cases, `@auth` for permission checks.
5. Assert the exact status first (`HTTP.CREATED`), then parse the body with its zod schema, then check values.
6. Every record a test creates must be removed: use `createBrand`/`createdBrand`, or register
   `cleanup.add(label, task)` right after creating it. Build data with `buildBrand()` so it carries the run tag.
7. Reads that verify a write go through the client methods, which send `Cache-Control: no-cache`.
8. No sleeps: `expect.poll` or `expect(...).toPass()` for eventual consistency.
9. Tests must pass alone, in parallel and shuffled. Never share state through module variables.
10. Negative tests use `createRaw` style client methods. Never weaken a schema to make a test pass.

## Rules for framework code

- Clients return `Promise<APIResponse<T>>` with explicit return types and never assert.
- New resource: schema in `src/schemas`, builder in `src/data`, client in `src/clients`,
  fixture in `src/fixtures/clients.fixtures.ts` (and a factory in `data.fixtures.ts` if tests create it).
- Use `type`, not `interface` (fixture generics need it). No `any`, no non-null `!`, no `console` outside the logger.
- Never add `eslint-disable` without a `-- reason`; never relax a lint rule to make code pass.

## Toolshop facts that shape the tests

- GET, POST, PUT and PATCH on `/brands` are public; DELETE needs an **admin** JWT
  (customer gets 403 `Forbidden`, anonymous 401 `Unauthorized`). PUT/PATCH return `{ "success": true }`.
- Unknown ids return 404 `{ "message": "Requested item not found" }`. Duplicate slug returns 409; other validation errors 422.
- JWTs live about 5 minutes (`expires_in`). `AuthSession` renews them; never cache tokens yourself.
- Repeated failed logins **lock non-admin accounts** for everyone (HTTP 423); admin accounts never lock. The shared demo
  customer is often locked by other people, so each worker registers its own customer (run-tagged email) and the admin
  deletes it after the run. Never write tests that guess passwords for the shared demo users.
- `GET /users/search` and `GET /users` return a paginated object (`{ data: [...] }`), not the array the spec documents.
- Logout and token refresh retire the token they were called with. Use `signedInCustomer` (a customer of the test's
  own), never the worker's `customerSession`, for logout, refresh, profile edits or lockout tests.
- Response bodies are redacted in `api-calls.json` like request bodies; never log a token another way.
- Products: everything but DELETE (admin) is public, creating included. Specs: reads are public, writes need any
  login, and they cascade when their product is deleted. `in_stock` is a boolean for shoppers but the stock count for
  admins. Lists are paginated (9 per page) and filtered to non-rentals unless `is_rental=1`.
- Register cleanup through `cleanup.add` only with clients built on `api`, `adminApi` or `customerApi`: the cleanup
  fixture depends on exactly those, so they outlive it. A context made later (e.g. `apiAs`) is closed before cleanup runs.
- The public database is shared, reset every hour by the Toolshop team, and can be reset by others. Never depend on seeded ids or counts; create your own data.
- GET responses carry `Cache-Control: public, max-age=120`. Verify writes with the client reads (they send `no-cache`).
- Name search (`/brands/search`, `/categories/search`, `/products/search`) is MySQL BOOLEAN MODE full-text, and the
  server caches each query's result for an hour without clearing it on create. Search for the `searchToken()` word
  every builder puts in the name, never for the run tag (its `-` means "exclude"). The sweep lists and filters by prefix.
- Categories are read one at a time through `GET /categories/tree/{id}` (there is no `GET /categories/{id}`).
  Deleting a category that still has subcategories returns 409.

## Safety rules for AI agents

- Never call `/refresh` (resets the shared database), `/users/forgot-password` or `/users/change-password`.
- Never delete or modify data that does not carry this run's tag (`qa-<RUN_ID>`).
- Never commit `.env.local`, tokens, passwords or downloaded specs (`openapi/toolshop.openapi.json` is git-ignored;
  the Toolshop licence forbids redistributing it).
- Never change an expected status or value just to make a red test green. Prove the API behaviour first
  (call log in `api-calls.json`, the spec, or the stub) and explain it in the PR.
- Definition of done: `npm run verify` is green (or `test:stub` when offline), `node scripts/agent-parity.mts` passes,
  and the PR template checklist is filled in.

## Agent toolkit

Shared skills (read by both Claude Code and Copilot) live in `.claude/skills/`:
`add-api-test`, `review-api-tests`, `triage-test-failures`, `check-spec-drift`.
Personas: `.claude/agents/*.md` (Claude Code, VS Code) mirrored by `.github/agents/*.agent.md` (Copilot).
Commands: `.claude/commands/*.md` mirrored by `.github/prompts/*.prompt.md`.
When you change one side of a pair, change the other; CI checks they match.
