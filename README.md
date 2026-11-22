# toolshop-api-tests

API test automation for the [Toolshop API](https://api.practicesoftwaretesting.com/api/documentation)
by Practice Software Testing, built with Playwright and TypeScript.

## What it does

- Tests the `/brands` endpoints with one test per HTTP method: GET, POST, PUT, PATCH and DELETE.
- Checks status codes, response contracts (zod) and role rules (only an admin can delete).
- Creates its own test data and cleans it up after every run.
- Produces HTML, JUnit and optional Allure reports, with readable `test.step` names.
- Runs against the public API or an offline stub, locally, in GitHub Actions or in Jenkins.

## Requirements

- Node.js 24 (see `.nvmrc`)
- Passwords for the public Toolshop demo accounts (published in the
  [practice-software-testing](https://github.com/testsmith-io/practice-software-testing) repository)

No browsers are needed.

## Setup

```bash
git clone https://github.com/youvegotnigel/toolshop-api-tests.git
cd toolshop-api-tests
npm ci
cp .env.example .env.local
```

Then set `ADMIN_PASSWORD` and `CUSTOMER_PASSWORD` in `.env.local`. This file is git-ignored.

## Run

| Command                                        | What it runs                                 |
| ---------------------------------------------- | -------------------------------------------- |
| `npm test`                                     | All tests against the public API             |
| `npm run test:stub`                            | All tests against the offline stub, no setup |
| `npm run test:smoke`                           | Tests tagged `@smoke`                        |
| `npx playwright test --grep @delete`           | Tests for one method or tag                  |
| `npm run verify`                               | Typecheck, lint, format check and all tests  |
| `npm run report`                               | Opens the last HTML report                   |
| `npm run test:allure && npm run allure:report` | Runs tests and opens the Allure report       |

## CI

- **GitHub Actions** (`.github/workflows/ci.yml`): add repository secrets `TOOLSHOP_ADMIN_PASSWORD` and
  `TOOLSHOP_CUSTOMER_PASSWORD`. Without them, CI runs against the offline stub and shows a warning.
- **Jenkins** (`Jenkinsfile`): add Secret text credentials `toolshop-admin-password` and
  `toolshop-customer-password`. Requires the Docker Pipeline, JUnit and HTML Publisher plugins.

## Project structure

```
src/clients     API clients, one per resource
src/fixtures    Playwright fixtures: auth, clients, test data
src/schemas     Response contracts (zod)
src/data        Test data builders
tests/          Specs, plus setup and teardown
stub/           Offline stand-in for the Toolshop API
```

## Contributing

Coding rules, conventions and the AI agent setup (Claude Code and GitHub Copilot) are in [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)
