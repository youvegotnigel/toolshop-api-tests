/**
 * Runs before `allure generate`. Playwright counts a `test.fail()` test that fails as PASSED (suite
 * health: the build stays green), and allure-playwright copies that. For the Allure report we want
 * product health instead: a known bug that still reproduces is shown as FAILED in the
 * "Known product defects" category, with its issue link and the real assertion error.
 * CI pass/fail is unaffected; only allure-results/*-result.json change.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Result = {
  status: string;
  labels?: { name: string; value: string }[];
  links?: { type?: string; url: string }[];
  statusDetails?: { message?: string; trace?: string };
};

const dir = process.argv[2] ?? 'allure-results';
let files: string[] = [];
try {
  files = readdirSync(dir).filter((f) => f.endsWith('-result.json'));
} catch {
  process.exit(0); // no Allure results in this run
}

let marked = 0;
for (const file of files) {
  const path = join(dir, file);
  const result = JSON.parse(readFileSync(path, 'utf8')) as Result;
  const isKnownBug = (result.labels ?? []).some((l) => l.name === 'tag' && l.value === 'known-bug');
  if (!isKnownBug) continue;
  const issue = (result.links ?? []).find((l) => l.type === 'issue')?.url ?? 'no issue linked';
  if (result.status === 'failed' && (result.statusDetails?.message ?? '') === '') {
    // Unexpected pass: Playwright reports no error, so say what it means.
    result.statusDetails = {
      message: `Expected to fail, but passed: the bug looks fixed. Remove test.fail() and close ${issue}`,
    };
    writeFileSync(path, JSON.stringify(result));
    continue;
  }
  if (result.status !== 'passed') continue;
  result.status = 'failed';
  result.statusDetails = {
    ...result.statusDetails,
    message:
      `Known product defect, still reproduces: ${issue}\n\n${result.statusDetails?.message ?? ''}`.trim(),
  };
  writeFileSync(path, JSON.stringify(result));
  marked += 1;
}
console.log(
  `allure-known-bugs: ${String(marked)} known product defect(s) marked failed in the Allure report`,
);
