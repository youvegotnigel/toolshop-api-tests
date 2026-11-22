## What and why

<!-- One or two sentences. Link the issue. -->

## Endpoints and scenarios covered

| Method | Endpoint | Scenario |
| ------ | -------- | -------- |
|        |          |          |

## Checklist

- [ ] `npm run verify` passes locally (typecheck, lint, format, tests)
- [ ] Specs import `test`/`expect` from `src/fixtures` and get clients and data from fixtures
- [ ] Every test is tagged and reads as `test.step` business steps
- [ ] Response contracts are validated with zod schemas
- [ ] Every created record is cleaned up (`cleanup` / factory fixture)
- [ ] No secrets, tokens or personal data in code, logs or attachments
- [ ] If written by an AI agent: reviewed with the `review-api-tests` skill and by a human
