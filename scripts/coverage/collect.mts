/** Turns a Playwright JSON report and the OpenAPI operation list into coverage and run metrics. */
import type { Config, Depth, KnownBug, OperationCoverage, RunSummary, Status, TestRecord } from './model.mts';
import { STATUSES } from './model.mts';

type JsonResult = { status: string; duration: number; error?: { message?: string } };
type JsonTest = {
  projectName: string;
  status: string;
  expectedStatus?: string;
  results: JsonResult[];
  annotations?: { type: string; description?: string }[];
};
type JsonSpec = { title: string; tags?: string[]; tests: JsonTest[] };
type JsonSuite = { title: string; specs?: JsonSpec[]; suites?: JsonSuite[] };
export type JsonReport = { suites: JsonSuite[]; stats: { startTime: string; duration: number } };

const OPERATION = /^(GET|POST|PUT|PATCH|DELETE) \//;

/** `/brands/{id}` and `/brands/{brandId}` are the same operation. */
export const normalise = (operation: string): string => operation.replace(/\{[^}]+\}/g, '{}');

const statusOf = (test: JsonTest): Status => {
  if (test.status === 'expected') return 'passed';
  if (test.status === 'flaky') return 'flaky';
  if (test.status === 'skipped') return 'skipped';
  const last = test.results.at(-1);
  if (last === undefined || last.status === 'timedOut' || last.status === 'interrupted') return 'broken';
  return (last.error?.message ?? '').includes('expect(') ? 'failed' : 'broken';
};

/** The describe title names the main operation; `covers` annotations add the others a test exercises. */
const operationsOf = (path: string[], test: JsonTest): string[] => {
  const main = path.find((t) => OPERATION.test(t));
  const extra = (test.annotations ?? [])
    .filter((a) => a.type === 'covers' && a.description !== undefined && OPERATION.test(a.description))
    .map((a) => a.description ?? '');
  return [...(main === undefined ? [] : [main]), ...extra];
};

const knownBugOf = (test: JsonTest, tags: string[]): KnownBug | undefined => {
  if (!tags.includes('@known-bug') || test.expectedStatus !== 'failed') return undefined;
  const note = (type: string): string | undefined =>
    test.annotations?.find((a) => a.type === type)?.description;
  return {
    summary: note('known-bug') ?? 'Known product defect',
    issue: note('issue'),
    // 'expected' = it failed, as declared: the defect is still there
    reproduces: test.status === 'expected',
  };
};

const walk = (suite: JsonSuite, titles: string[], projects: Set<string>, out: TestRecord[]): void => {
  const path = suite.title === '' ? titles : [...titles, suite.title];
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests.filter((t) => projects.has(t.projectName))) {
      const tags = (spec.tags ?? []).map((tag) => (tag.startsWith('@') ? tag : `@${tag}`));
      const knownBug = knownBugOf(test, tags);
      out.push({
        title: [...path.filter((t) => !t.endsWith('.ts')), spec.title].join(' › '),
        operations: operationsOf(path, test),
        // The JSON reporter drops the '@'; keep one spelling everywhere
        tags,
        status: statusOf(test),
        durationMs: test.results.reduce((sum, r) => sum + r.duration, 0),
        ...(knownBug === undefined ? {} : { knownBug }),
      });
    }
  }
  for (const child of suite.suites ?? []) walk(child, path, projects, out);
};

export const collectTests = (report: JsonReport, config: Config): TestRecord[] => {
  const out: TestRecord[] = [];
  const projects = new Set(config.projects);
  for (const suite of report.suites) walk(suite, [], projects, out);
  return out;
};

const depthOf = (tests: TestRecord[]): Depth => ({
  // @auth tests still exercise the success path (e.g. admin deletes); only pure @negative tests do not
  happy: tests.some((t) => !t.tags.includes('@negative')),
  negative: tests.some((t) => t.tags.includes('@negative')),
  auth: tests.some((t) => t.tags.includes('@auth')),
});

export const collectCoverage = (
  operations: string[],
  tests: TestRecord[],
  config: Config,
): OperationCoverage[] => {
  const critical = new Set(config.critical.map(normalise));
  return operations
    .filter((op) => config.methods.includes(op.split(' ')[0] ?? ''))
    .map((operation) => {
      const [method = '', path = ''] = operation.split(' ');
      const matching = tests.filter((t) => t.operations.some((op) => normalise(op) === normalise(operation)));
      return {
        operation,
        method,
        resource: path.split('/')[1] ?? '',
        critical: critical.has(normalise(operation)),
        tests: matching.length,
        depth: depthOf(matching),
        failing: matching.some((t) => t.status === 'failed' || t.status === 'broken'),
      };
    });
};

const percent = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

export type RunMeta = { runNumber: string; commit: string; env: string };

export const summarise = (
  report: JsonReport,
  tests: TestRecord[],
  operations: OperationCoverage[],
  meta: RunMeta,
): RunSummary => {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const test of tests) counts[test.status] += 1;
  const executed = tests.length - counts.skipped;
  const critical = operations.filter((o) => o.critical);
  return {
    ...meta,
    date: report.stats.startTime,
    durationMs: Math.round(report.stats.duration),
    total: tests.length,
    counts,
    passRate: percent(counts.passed + counts.flaky, executed),
    coverage: percent(operations.filter((o) => o.tests > 0).length, operations.length),
    criticalCoverage: percent(critical.filter((o) => o.tests > 0).length, critical.length),
  };
};

/** Keeps the latest 30 runs; re-running the same run number replaces its entry. */
export const appendHistory = (history: RunSummary[], run: RunSummary): RunSummary[] =>
  [...history.filter((h) => h.runNumber !== run.runNumber), run].slice(-30);
