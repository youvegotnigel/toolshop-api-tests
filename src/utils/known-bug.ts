import type { TestDetails } from '@playwright/test';

const ISSUES = 'https://github.com/youvegotnigel/toolshop-api-tests/issues';

export const KNOWN_BUG_TAG = '@known-bug';

/**
 * Details for a test that reproduces a confirmed product defect. Declare the test with `test.fail(...)`:
 * while the bug exists the test fails as expected (build green, bug visible in every report);
 * when the product is fixed it passes unexpectedly and turns the build red, so the marker gets removed.
 * The assertions describe the CORRECT behaviour. Never assert the buggy response.
 */
export const knownBug = (issue: number, summary: string, extraTags: string[] = []): TestDetails => ({
  tag: [KNOWN_BUG_TAG, ...extraTags],
  annotation: [
    { type: 'issue', description: `${ISSUES}/${String(issue)}` },
    { type: 'known-bug', description: summary },
  ],
});
