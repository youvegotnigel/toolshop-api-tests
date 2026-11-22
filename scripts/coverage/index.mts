/**
 * Builds the test automation dashboard.
 *   node scripts/coverage/index.mts [--results test-results/results.json] [--history coverage-history/history.json] [--site site]
 * Writes <site>/index.html (dashboard), <site>/summary.json and <site>/history.json, updates the history file,
 * and copies allure-report/ and playwright-report/ into <site>/allure and <site>/playwright when they exist.
 * Works the same on GitHub Actions, Jenkins and locally.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  appendHistory,
  collectCoverage,
  collectTests,
  summarise,
  type JsonReport,
  type RunMeta,
} from './collect.mts';
import type { Config, Dashboard, Links, RunSummary } from './model.mts';
import { renderDashboard } from './render.mts';

const arg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
};

const readJson = <T,>(file: string, fallback: T): T =>
  existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : fallback;

const gitCommit = (): string => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};

const runMeta = (): RunMeta => ({
  runNumber: process.env.GITHUB_RUN_NUMBER ?? process.env.BUILD_NUMBER ?? `local-${Date.now().toString(36)}`,
  commit: process.env.GITHUB_SHA ?? process.env.GIT_COMMIT ?? gitCommit(),
  env: process.env.TEST_ENV ?? 'public',
});

const runUrl = (): string | undefined => {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, BUILD_URL } = process.env;
  if (GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID) {
    return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
  }
  return BUILD_URL;
};

const copyReport = (from: string, to: string): string | undefined => {
  if (!existsSync(path.join(from, 'index.html'))) return undefined;
  cpSync(from, to, { recursive: true });
  return `${path.basename(to)}/`;
};

const resultsFile = arg('results', 'test-results/results.json');
const historyFile = arg('history', 'coverage-history/history.json');
const site = arg('site', 'site');

if (!existsSync(resultsFile)) {
  console.error(`No results at ${resultsFile}. Run the tests first (the json reporter writes it).`);
  process.exit(1);
}

const config = readJson<Config | undefined>('coverage.config.json', undefined);
if (config === undefined) throw new Error('coverage.config.json is missing');
const report = readJson<JsonReport>(resultsFile, {
  suites: [],
  stats: { startTime: new Date().toISOString(), duration: 0 },
});
const lock = readJson<{ operations: string[] }>('openapi/operations.lock.json', { operations: [] });

const tests = collectTests(report, config);
const operations = collectCoverage(lock.operations, tests, config);
const summary = summarise(report, tests, operations, runMeta());
const history = appendHistory(readJson<RunSummary[]>(historyFile, []), summary);

mkdirSync(site, { recursive: true });
const links: Links = {
  allure: copyReport('allure-report', path.join(site, 'allure')),
  playwright: copyReport('playwright-report', path.join(site, 'playwright')),
  run: runUrl(),
};
const dashboard: Dashboard = { config, summary, operations, tests, history, links };

writeFileSync(path.join(site, 'index.html'), renderDashboard(dashboard));
writeFileSync(path.join(site, 'summary.json'), JSON.stringify({ summary, operations }, null, 2));
writeFileSync(path.join(site, 'history.json'), JSON.stringify(history, null, 2));
mkdirSync(path.dirname(historyFile), { recursive: true });
writeFileSync(historyFile, JSON.stringify(history, null, 2));

console.log(
  `Dashboard: ${path.join(site, 'index.html')} | pass rate ${String(summary.passRate)}% | coverage ${String(summary.coverage)}% ` +
    `(${String(operations.filter((o) => o.tests > 0).length)}/${String(operations.length)}) | critical ${String(summary.criticalCoverage)}%`,
);
