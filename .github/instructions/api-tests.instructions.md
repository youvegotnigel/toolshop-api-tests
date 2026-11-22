---
applyTo: 'tests/**/*.ts'
---

Specs in this folder follow AGENTS.md rules 1 to 10. In short:

- `import { test, expect } from '../../src/fixtures';` and nothing from `@playwright/test`.
- One `test.describe('<METHOD> <path>', { tag: [...] }, ...)` per file, tags for resource and method.
- 2 to 6 flat `test.step` calls written for a manager reading the report.
- Exact status first, then the zod schema, then values. Data from `createBrand`/`createdBrand` or `cleanup.add`.
