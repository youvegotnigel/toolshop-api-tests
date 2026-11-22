---
name: check-spec-drift
description: 'Detect and handle changes in the live Toolshop OpenAPI spec versus openapi/operations.lock.json, then update clients, schemas, tests and the lock file. Use when the spec-drift workflow opens an issue or before a release.'
---

# Check spec drift

1. `npm run spec:check`. Exit 0 means no added or removed operations; stop and report "no drift".
2. For each **removed** operation (`- METHOD /path`):
   - `grep -rn "/path" src tests` to find clients and specs that use it.
   - Confirm with the live API before deleting anything; removed from the spec is not always removed from the API.
   - Remove or update the client method and its tests in the same PR.
3. For each **added** operation (`+ METHOD /path`):
   - Do not write tests automatically. Create one GitHub issue per resource with the `API test request` template,
     listing the new operations, so a human prioritises them (or the `add-api-test` skill picks them up).
4. For changed request or response shapes on covered endpoints, run the affected specs; schema failures show the change.
   Update the zod schema only when the spec and the live API agree.
5. When everything is handled, `npm run spec:update` refreshes `openapi/operations.lock.json`. Commit it with the changes.
6. Report: added, removed, impacted files, issues opened, and whether the lock was updated.
