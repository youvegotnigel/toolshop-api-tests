---
description: 'Triage the latest failed test run'
argument-hint: 'optional: GitHub Actions run id'
---

Triage failed tests. Run id (optional): $ARGUMENTS

Use the failure-triager subagent with the triage-test-failures skill. If a run id is given,
download its artifact with `gh run download <id>` first. Report per failure: class, evidence, next action.
