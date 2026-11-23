---
name: triage-test-failures
description: 'Triage failed Playwright API test runs using failure-summary.json, api-calls.json and the spec; classify each failure as product bug, test bug, test data, or environment, and propose the fix. Use after a red local run or CI run.'
---

# Triage test failures

## 1. Collect evidence

1. `test-results/failure-summary.json`: every failed attempt, project, error line and `correlationId`.
   From CI, download the `test-reports-<run id>` artifact first (`gh run download <run id>`).
2. For each failure, read `test-results/artifacts/<test folder>/api-calls.json` (method, URL, status, timing,
   redacted request, response body) and `error-context.md` in the same folder.
3. Note whether it failed on every attempt or only some (flaky), and whether other tests on the same endpoint failed.

## 2. Reproduce

1. `npx playwright test <file> -g "<title>" --repeat-each=3`
2. `npm run test:stub` for the same test. Green on the stub but red on the public API points to the API or its data.
3. Check the operation in the spec (`node scripts/spec-drift.mts --pull`) and run `npm run spec:check`.

## 3. Classify

| Class       | Typical evidence                                                                                                                                                | Action                                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product bug | API response contradicts the spec or documented rule, reproducible                                                                                              | File a `bug` + `known-bug` issue with the call log, then mark the test `test.fail` + `knownBug()` (AGENTS.md rule 11); keep asserting the correct behaviour |
| Test bug    | Wrong expectation, missing cleanup, shared state, wrong fixture or role                                                                                         | Fix the test and prove it with `--repeat-each=3 --shuffle`                                                                                                  |
| Test data   | 404/409 on data the test did not create, database reset by others                                                                                               | Make the test create its own data via fixtures                                                                                                              |
| Environment | 5xx, 429, timeouts, `/status` failing, login locked or expired; admin login 401 and vanished data on a run crossing the top of the hour (hourly database reset) | Re-run, report the outage; never weaken assertions                                                                                                          |

## 4. Report

One section per failure: test, class, evidence (status, short body excerpt, correlation id), root cause,
proposed fix or bug report. Never change an expected value only to turn a test green.
