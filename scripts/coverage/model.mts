/** Shared types for the coverage dashboard. */
export type Status = 'passed' | 'failed' | 'broken' | 'flaky' | 'skipped';

export const STATUSES: readonly Status[] = ['passed', 'failed', 'broken', 'flaky', 'skipped'];

export type Config = {
  suite: { name: string; framework: string; group: string };
  targetCoverage: number;
  staleAfterHours: number;
  projects: string[];
  methods: string[];
  critical: string[];
};

export type TestRecord = {
  title: string;
  /** From the describe title `METHOD /path`, plus any `covers` annotations. */
  operations: string[];
  tags: string[];
  status: Status;
  durationMs: number;
  /** Set for `test.fail()` tests tagged @known-bug (see src/utils/known-bug.ts). */
  knownBug?: KnownBug;
};

export type KnownBug = {
  summary: string;
  issue?: string;
  /** true: failed as expected, the defect still reproduces. false: passed unexpectedly, looks fixed. */
  reproduces: boolean;
};

export type Depth = { happy: boolean; negative: boolean; auth: boolean };

export type OperationCoverage = {
  operation: string;
  method: string;
  resource: string;
  critical: boolean;
  tests: number;
  depth: Depth;
  failing: boolean;
};

export type RunSummary = {
  runNumber: string;
  date: string;
  commit: string;
  env: string;
  durationMs: number;
  total: number;
  counts: Record<Status, number>;
  passRate: number;
  coverage: number;
  criticalCoverage: number;
};

export type Links = { allure?: string; playwright?: string; run?: string };

export type Dashboard = {
  config: Config;
  summary: RunSummary;
  operations: OperationCoverage[];
  tests: TestRecord[];
  history: RunSummary[];
  links: Links;
};
