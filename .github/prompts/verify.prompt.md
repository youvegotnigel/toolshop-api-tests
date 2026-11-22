---
description: 'Run the full quality gate and summarise the result'
agent: agent
---

<!-- Mirror of .claude/commands/verify.md. Keep both in sync. -->

Run `npm run verify`. If the public API is unreachable from this environment, run
`npm run typecheck && npm run lint && npm run format:check && npm run test:stub` instead and say so.
Report: each gate (pass or fail), failing tests with their first error line, and the next action.
If tests failed, offer to run the triage-test-failures skill.
