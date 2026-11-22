# Copilot instructions

Read and follow **[AGENTS.md](../AGENTS.md)** for every task in this repository. It is the single source of truth
for commands, architecture, test rules and safety rules, shared with Claude Code.

The essentials, in case you only read this file:

- Specs import `test`/`expect` from `src/fixtures` and get clients, contexts and data from fixtures.
- Every test is tagged and written as flat `test.step` business steps that managers can read in reports.
- Assert the exact status, then validate the body with its zod schema. Clean up every record you create.
- Done means `npm run verify` is green (`npm run test:stub` when the sandbox has no network).

Reusable workflows: skills in `.claude/skills/`, custom agents in `.github/agents/`, prompts in `.github/prompts/`.
For Copilot cloud agent, allow `api.practicesoftwaretesting.com` in the repository's Copilot firewall settings,
or run against the offline stub.
