# toolshop-api-tests

Agentic, review-friendly API test automation for the
[Practice Software Testing Toolshop API](https://api.practicesoftwaretesting.com/api/documentation),
built with Playwright and TypeScript. It starts with five tests, one per HTTP method on `/brands`,
and is designed to grow endpoint by endpoint, by engineers, Claude Code or GitHub Copilot.

[![api-tests](https://github.com/youvegotnigel/toolshop-api-tests/actions/workflows/ci.yml/badge.svg)](https://github.com/youvegotnigel/toolshop-api-tests/actions/workflows/ci.yml)

## Quick start

```bash
nvm use                      # Node 24
npm ci                       # no browsers needed for API tests
cp .env.example .env.local   # add the public demo passwords
npm test                     # public API
npm run test:stub            # offline, no credentials needed
npm run report               # open the HTML report
```

## What the five tests cover

| Method | Test                                                  | Highlights                                        |
| ------ | ----------------------------------------------------- | ------------------------------------------------- |
| GET    | A shopper can open a brand and find it in the list    | Seeded by a fixture, contract on item and list    |
| POST   | A new brand is created and matches the API contract   | 201, zod contract, cleanup registered immediately |
| PUT    | Replacing a brand updates both its name and slug      | `{ success: true }`, read-back with `no-cache`    |
| PATCH  | Renaming a brand changes only its name                | Partial update, slug unchanged                    |
| DELETE | Only an admin can delete a brand, and it is then gone | Customer 403, admin 204, then 404                 |

Every test is written as business-language `test.step`s, so the HTML and Allure reports read like a checklist
a manager can follow.

## How it fits together

```
npm test
 └─ playwright.config.ts ── loads .env.local + .env.<TEST_ENV>, sets RUN_ID, reporters, projects
     ├─ setup     tests/setup/environment.setup.ts      records the API version under test
     ├─ api       tests/brands/*.spec.ts
     │    └─ src/fixtures ── envGuard (auto) ─ admin/customer sessions (worker, JWT auto-renew)
     │                      ─ api / adminApi / customerApi (recorded, correlation id)
     │                      ─ brandsClient ... ─ cleanup ─ createBrand ─ createdBrand
     └─ teardown  tests/setup/sweep-test-data.teardown.ts  deletes anything tagged qa-<RUN_ID>
 reports: list/line, HTML, JUnit, failure-summary.json (+ GitHub job summary), Allure with ALLURE=1
```

The full rule book is [AGENTS.md](AGENTS.md).

## Quality gates

- **TypeScript** strict, `noUncheckedIndexedAccess`.
- **ESLint** (type-aware, zero warnings): `typescript-eslint` strict + stylistic, `eslint-plugin-playwright`,
  plus framework guardrails that fail the build when a spec imports `@playwright/test` directly, uses the raw
  `request` fixture, sleeps, skips `test.step`, or has no tags.
- **Prettier**, **Husky + lint-staged** pre-commit, and a CI check that Claude Code and Copilot files stay in sync.

## CI

- **GitHub Actions** `.github/workflows/ci.yml`: quality gate, then tests on PRs, `main`, nightly and on demand
  (choose `public` or `stub` and a tag). Add secrets `TOOLSHOP_ADMIN_PASSWORD` and `TOOLSHOP_CUSTOMER_PASSWORD`.
- **Jenkins** `Jenkinsfile`: same stages in a `node:24` container; needs the Docker Pipeline, JUnit and
  HTML Publisher plugins and Secret text credentials `toolshop-admin-password`, `toolshop-customer-password`.
- **Spec drift** `.github/workflows/spec-drift.yml`: weekly comparison of the live OpenAPI operations with
  `openapi/operations.lock.json`; opens an issue for an agent or engineer when they differ.

## Working with AI agents

| Capability                 | Claude Code                                      | GitHub Copilot                                   |
| -------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| Project rules              | `CLAUDE.md` imports `AGENTS.md`                  | `.github/copilot-instructions.md` -> `AGENTS.md` |
| Skills (shared, one copy)  | `.claude/skills/*`                               | same folder, read natively                       |
| Specialist agents          | `.claude/agents/*.md`                            | `.github/agents/*.agent.md`                      |
| Commands / prompts         | `/verify`, `/new-api-test`, `/triage`, `/review` | `.github/prompts/*.prompt.md`                    |
| Guardrails                 | lint-on-edit hook, permission rules              | path instructions, `copilot-setup-steps.yml`     |
| Offline loop for sandboxes | `npm run test:stub`                              | same                                             |

Example: `/new-api-test GET /products/{productId}` runs spec analysis, implementation and review in sequence.
In Copilot cloud agent, file an **API test request** issue and assign it to Copilot.

## Good to know

- The public API and its database are shared. Tests create their own data, tag it with `qa-<RUN_ID>`,
  and clean it up; never depend on seeded ids.
- Repeated failed logins lock the shared demo accounts, so the framework never retries a failed login.
- The Toolshop licence does not allow redistributing its source or spec. This repo commits only the list of
  operation names; `node scripts/spec-drift.mts --pull` downloads the spec locally (git-ignored).
- TypeScript is pinned to 6.x because `typescript-eslint` 8 does not support TypeScript 7 yet.
