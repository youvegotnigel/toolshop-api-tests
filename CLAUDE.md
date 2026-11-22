@AGENTS.md

## Claude Code specifics

- Skills in `.claude/skills/` are also slash commands: `/add-api-test`, `/review-api-tests`,
  `/triage-test-failures`, `/check-spec-drift`.
- Delegate with subagents in `.claude/agents/`: `spec-analyst` (read-only research), `api-test-writer`,
  `api-test-reviewer` (read-only), `failure-triager`.
- Commands in `.claude/commands/`: `/verify`, `/new-api-test <METHOD /path>`, `/triage`, `/review`.
- A PostToolUse hook lints and formats every file you edit; if it reports ESLint errors, fix them before moving on.
- Plan first for anything touching more than one resource, then implement one endpoint at a time.
