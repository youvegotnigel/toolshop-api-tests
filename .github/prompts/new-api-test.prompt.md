---
description: 'Add API test coverage for an endpoint, from spec analysis to a reviewed change'
agent: api-test-writer
argument-hint: 'METHOD /path, e.g. GET /products/{productId}'
---

<!-- Mirror of .claude/commands/new-api-test.md. Keep both in sync. -->

Add API test coverage for: ${input:endpoint:METHOD /path}

1. Analyse the operation as the spec-analyst agent would and list scenarios in business language.
2. Implement them by following `.claude/skills/add-api-test/SKILL.md`.
3. Review the diff with `.claude/skills/review-api-tests/SKILL.md` and fix every blocking finding.
4. Summarise the endpoints, scenarios (as their test.step names) and verification results.
