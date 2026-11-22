---
description: 'Review the current branch or given files against the framework rules'
agent: api-test-reviewer
argument-hint: 'optional: files or PR number'
---

<!-- Mirror of .claude/commands/review.md. Keep both in sync. -->

Review: ${input:target:files or PR number, empty for current branch}

Follow `.claude/skills/review-api-tests/SKILL.md` and return the findings table and verdict.
