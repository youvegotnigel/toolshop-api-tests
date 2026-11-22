---
description: 'Add API test coverage for an endpoint, from spec analysis to a reviewed change'
argument-hint: 'METHOD /path, e.g. GET /products/{productId}'
---

Add API test coverage for: $ARGUMENTS

1. Use the spec-analyst subagent to produce the endpoint brief and scenarios.
2. Use the api-test-writer subagent to implement them with the add-api-test skill.
3. Use the api-test-reviewer subagent on the diff and fix every blocking finding.
4. Summarise the endpoints, scenarios (as their test.step names) and verification results.
