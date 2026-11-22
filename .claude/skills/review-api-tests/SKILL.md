---
name: review-api-tests
description: "Review Playwright API test code or a PR diff against this framework's rules (fixtures, test.step, contracts, cleanup, security) and report blocking and non-blocking findings. Use before opening or approving a PR."
---

# Review API tests

Read-only. Never edit files during a review; report findings instead.

## 1. Gather

1. `git diff --stat origin/main...HEAD` and `git diff origin/main...HEAD` (or the files you were given).
2. `npm run lint` and `npm run typecheck`. Every error is a blocking finding.

## 2. Check

Blocking (must fix before merge):

- [ ] Imports `test`/`expect` only from `src/fixtures`; no `request`/`playwright` fixture, no other HTTP library
- [ ] Every test has a `test.describe('<METHOD> <path>')` parent, tags, and 2 to 6 flat `test.step` calls
- [ ] Step names are business language a manager understands (no method names, status codes as the whole name, or "step 1")
- [ ] Exact status asserted before the body; body validated with a zod schema
- [ ] Every created record is removed via a factory fixture or `cleanup.add` registered immediately after creation
- [ ] No dependency on seeded ids, counts or ordering in the shared database
- [ ] No sleeps, no conditionals deciding what to assert, no `test.only`, no unexplained `test.skip`
- [ ] No secrets, tokens or personal data in code, logs, test names or attachments
- [ ] Clients have explicit return types and no assertions; schemas have no `any` or loosened types to dodge failures
- [ ] Expectations changed in this PR are justified by the spec or captured API behaviour, not by "it was red"

Non-blocking (improve when cheap):

- [ ] Negative path for the main validation or permission rule exists or has an issue
- [ ] Reuses existing builders, schemas and fixtures instead of near-duplicates
- [ ] Names say what and why; no comments that restate the code

## 3. Report

Return a table: `Severity | File:line | Finding | Suggested fix`, blocking first, then a one-line verdict:
`Approve`, `Approve with nits`, or `Changes requested`. Credit what was done well in one line.
