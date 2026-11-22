import fs from 'node:fs';
import path from 'node:path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

type Failure = {
  test: string;
  project: string;
  file: string;
  attempt: number;
  error: string;
  correlationId?: string;
};

const ANSI = new RegExp(String.raw`\u001b\[[0-9;]*m`, 'g');
const SUMMARY_FILE = path.join('test-results', 'failure-summary.json');

/**
 * Custom reporter for humans and agents:
 * - writes test-results/failure-summary.json (read by the triage skill and agents)
 * - adds a failures table to the GitHub Actions job summary when running there
 * Flaky attempts are recorded too, so retries never hide instability.
 */
export default class FailureTracker implements Reporter {
  private readonly failures: Failure[] = [];

  printsToStdio(): boolean {
    return false;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === test.expectedStatus) return;
    const message = result.error?.message ?? result.status;
    this.failures.push({
      test: test.titlePath().filter(Boolean).slice(2).join(' > '),
      project: test.parent.project()?.name ?? 'unknown',
      file: path.relative(process.cwd(), test.location.file),
      attempt: result.retry + 1,
      error: message.replace(ANSI, '').split('\n')[0] ?? result.status,
      correlationId: result.annotations.find((a) => a.type === 'correlation-id')?.description,
    });
  }

  onEnd(result: FullResult): void {
    fs.mkdirSync(path.dirname(SUMMARY_FILE), { recursive: true });
    fs.writeFileSync(
      SUMMARY_FILE,
      JSON.stringify({ status: result.status, runId: process.env.RUN_ID, failures: this.failures }, null, 2),
    );
    this.writeGitHubSummary(result);
  }

  private writeGitHubSummary(result: FullResult): void {
    const target = process.env.GITHUB_STEP_SUMMARY;
    if (target === undefined || target === '') return;
    const rows = this.failures
      .map((f) => `| ${f.project} | ${f.test} | ${String(f.attempt)} | ${f.error.replaceAll('|', '\\|')} |`)
      .join('\n');
    const body =
      this.failures.length === 0
        ? `### API tests: ${result.status}, no failed attempts\n`
        : `### API tests: ${result.status}\n\n| Project | Test | Attempt | Error |\n| --- | --- | --- | --- |\n${rows}\n`;
    fs.appendFileSync(target, body);
  }
}
