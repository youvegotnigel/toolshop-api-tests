---
description: 'Triage the latest failed test run'
agent: failure-triager
argument-hint: 'optional: GitHub Actions run id'
---

<!-- Mirror of .claude/commands/triage.md. Keep both in sync. -->

Triage failed tests. Run id (optional): ${input:runId:GitHub Actions run id or leave empty}

Follow `.claude/skills/triage-test-failures/SKILL.md`. If a run id is given, download its artifact with
`gh run download <id>` first. Report per failure: class, evidence, next action.
