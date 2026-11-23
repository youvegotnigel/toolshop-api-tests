/** Renders the coverage dashboard as one self-contained HTML page. */
import type { Dashboard, OperationCoverage, RunSummary, TestRecord } from './model.mts';
import { STATUSES } from './model.mts';
import {
  COLORS,
  coverageColor,
  donut,
  escapeHtml,
  methodBars,
  sparkline,
  statusBar,
  trendChart,
} from './charts.mts';
import { STYLES } from './styles.mts';

const duration = (ms: number): string => {
  if (ms < 1000) return `${String(Math.round(ms))}ms`;
  const seconds = Math.round(ms / 1000);
  return seconds >= 60
    ? `${String(Math.floor(seconds / 60))}m ${String(seconds % 60).padStart(2, '0')}s`
    : `${String(seconds)}s`;
};

const delta = (history: RunSummary[]): string => {
  const previous = history.at(-2);
  const current = history.at(-1);
  if (previous === undefined || current === undefined) return '± 0';
  const diff = Math.round((current.passRate - previous.passRate) * 10) / 10;
  if (diff === 0) return '± 0';
  return diff > 0 ? `▲ ${String(diff)}` : `▼ ${String(Math.abs(diff))}`;
};

const link = (href: string | undefined, label: string): string =>
  href === undefined ? '' : `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;

const suiteCard = (d: Dashboard): string => {
  const s = d.summary;
  const failing = s.counts.failed + s.counts.broken > 0;
  const rateColor = failing ? COLORS.failed : COLORS.passed;
  const legend = STATUSES.filter((st) => s.counts[st] > 0)
    .map((st) => `<span><i style="background:${COLORS[st]}"></i><b>${String(s.counts[st])}</b> ${st}</span>`)
    .join('');
  return `<article class="card suite ${failing ? 'is-failing' : 'is-passing'}">
  <header><span class="badge">${escapeHtml(d.config.suite.framework.toUpperCase())}</span><span class="group">${escapeHtml(d.config.suite.group.toUpperCase())}</span>
  <span class="pills"><span class="pill ${failing ? 'red' : 'green'}">${failing ? 'Failing' : 'Passing'}</span><span class="pill purple stale" data-stale-after="${String(d.config.staleAfterHours)}" data-time="${escapeHtml(s.date)}" hidden>Stale</span></span></header>
  <h2>${escapeHtml(d.config.suite.name)}</h2>
  <div class="rate-row"><div><div class="rate" style="color:${rateColor}">${String(s.passRate)}<small>%</small></div>
  <div class="muted">pass rate <b class="delta">${delta(d.history)}</b></div></div>${sparkline(
    d.history.map((h) => h.passRate),
    rateColor,
  )}</div>
  ${statusBar(s.counts)}<div class="legend">${legend}</div>
  <div class="cov"><span class="label">COVERAGE</span><span class="track"><span style="width:${String(s.coverage)}%;background:${coverageColor(s.coverage)}"></span><i style="left:${String(d.config.targetCoverage)}%" title="target ${String(d.config.targetCoverage)}%"></i></span><b style="color:${coverageColor(s.coverage)}">${String(s.coverage)}%</b></div>
  <footer><span>${String(s.total)} tests</span><span>${duration(s.durationMs)}</span><span class="ago" data-time="${escapeHtml(s.date)}"></span>
  <span class="spacer"></span>${link(d.links.allure, 'Allure report')}${link(d.links.run, `#${s.runNumber}`)}</footer></article>`;
};

const kpi = (label: string, value: string, note: string, color?: string): string =>
  `<div class="card kpi"><span class="label">${label}</span><b style="${color === undefined ? '' : `color:${color}`}">${value}</b><span class="muted">${note}</span></div>`;

const kpis = (d: Dashboard): string => {
  const s = d.summary;
  const covered = d.operations.filter((o) => o.tests > 0).length;
  const critical = d.operations.filter((o) => o.critical);
  return `<div class="kpis">${kpi('Operation coverage', `${String(s.coverage)}%`, `${String(covered)} of ${String(d.operations.length)} operations, target ${String(d.config.targetCoverage)}%`, coverageColor(s.coverage))}
${kpi('Critical flows', `${String(s.criticalCoverage)}%`, `${String(critical.filter((o) => o.tests > 0).length)} of ${String(critical.length)} critical operations`, coverageColor(s.criticalCoverage))}
${kpi('Pass rate', `${String(s.passRate)}%`, `${String(s.counts.passed)} passed, ${String(s.counts.flaky)} flaky`)}
${kpi('Known product bugs', String(d.tests.filter((t) => t.knownBug?.reproduces === true).length), 'confirmed defects still reproducing', d.tests.some((t) => t.knownBug?.reproduces === true) ? COLORS.failed : undefined)}
${kpi('Last run', duration(s.durationMs), `${String(s.total)} tests on ${escapeHtml(s.env)}`)}</div>`;
};

const heatmap = (d: Dashboard): string => {
  const resources = [...new Set(d.operations.map((o) => o.resource))].sort();
  const head = `<tr><th>Resource</th>${d.config.methods.map((m) => `<th>${m}</th>`).join('')}<th>Total</th></tr>`;
  const cell = (ops: OperationCoverage[]): string => {
    if (ops.length === 0) return '<td class="na">·</td>';
    const covered = ops.filter((o) => o.tests > 0).length;
    const ratio = covered / ops.length;
    const deep = ops.some((o) => o.depth.negative || o.depth.auth) ? ' deep' : '';
    return `<td class="hm${deep}" style="--r:${ratio.toFixed(2)}">${String(covered)}/${String(ops.length)}</td>`;
  };
  const rows = resources
    .map((r) => {
      const ops = d.operations.filter((o) => o.resource === r);
      const covered = ops.filter((o) => o.tests > 0).length;
      return `<tr><th>/${escapeHtml(r)}</th>${d.config.methods.map((m) => cell(ops.filter((o) => o.method === m))).join('')}<td class="tot">${String(covered)}/${String(ops.length)}</td></tr>`;
    })
    .join('');
  return `<table class="heat">${head}${rows}</table>`;
};

const depthChips = (o: OperationCoverage): string =>
  o.tests === 0
    ? '<span class="chip gap">not covered</span>'
    : [
        o.depth.happy ? '<span class="chip">happy path</span>' : '',
        o.depth.negative ? '<span class="chip">negative</span>' : '',
        o.depth.auth ? '<span class="chip">auth</span>' : '',
        o.failing ? '<span class="chip red">failing</span>' : '',
      ].join('');

const operationRow = (o: OperationCoverage): string =>
  `<tr><td><span class="verb ${o.method.toLowerCase()}">${o.method}</span> <code>${escapeHtml(o.operation.slice(o.method.length + 1))}</code></td><td>${String(o.tests)}</td><td>${depthChips(o)}</td></tr>`;

const gaps = (d: Dashboard): string => {
  const resources = [...new Set(d.operations.map((o) => o.resource))].sort();
  return resources
    .map((r) => {
      const ops = d.operations.filter((o) => o.resource === r);
      const open = ops.filter((o) => o.tests === 0).length;
      return `<details><summary><b>/${escapeHtml(r)}</b><span class="muted">${String(ops.length - open)}/${String(ops.length)} covered</span></summary><div class="scroll"><table class="ops"><tr><th>Operation</th><th>Tests</th><th>Depth</th></tr>${ops.map(operationRow).join('')}</table></div></details>`;
    })
    .join('');
};

/**
 * Passed: the dot alone (label kept for screen readers and as a tooltip). Anything else keeps a
 * visible label too, so a failure never depends on telling red from green (WCAG 2.2, 1.4.1).
 */
const statusCell = (status: TestRecord['status']): string => {
  const dot = `<span class="dot" style="background:${COLORS[status]}" title="${status}" aria-hidden="true"></span>`;
  return status === 'passed'
    ? `<td class="status">${dot}<span class="sr-only">${status}</span></td>`
    : `<td class="status">${dot}${status}</td>`;
};

const testRows = (tests: TestRecord[]): string =>
  tests
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.title)}</td><td>${t.tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join('')}</td>${statusCell(t.status)}<td class="num">${duration(t.durationMs)}</td></tr>`,
    )
    .join('');

const knownBugs = (d: Dashboard): string => {
  const bugs = d.tests.filter((t) => t.knownBug !== undefined);
  if (bugs.length === 0) return '';
  const rows = bugs
    .map((t) => {
      const bug = t.knownBug;
      if (bug === undefined) return '';
      const state = bug.reproduces
        ? '<span class="chip red">still reproduces</span>'
        : '<span class="chip green">looks fixed: remove test.fail()</span>';
      const issue = bug.issue === undefined ? '' : link(bug.issue, `#${bug.issue.split('/').at(-1) ?? ''}`);
      return `<tr><td><b>${escapeHtml(bug.summary)}</b><br><span class="muted small">${escapeHtml(t.title)}</span></td><td>${issue}</td><td>${state}</td></tr>`;
    })
    .join('');
  return `<section class="card"><h3>Known product bugs</h3><p class="muted small">Confirmed defects in the API under test, each reproduced by a <code>test.fail()</code> test. They keep the build green while they reproduce and turn it red once fixed.</p><div class="scroll"><table class="ops"><tr><th>Bug</th><th>Issue</th><th>State</th></tr>${rows}</table></div></section>`;
};

const CLIENT_SCRIPT = `<script>
for (const el of document.querySelectorAll('[data-time]')) {
  const hours = (Date.now() - Date.parse(el.dataset.time)) / 36e5;
  if (el.classList.contains('ago')) {
    el.textContent = hours < 1 ? 'just now' : hours < 48 ? Math.round(hours) + ' hours ago' : Math.round(hours / 24) + ' days ago';
    if (hours > 48) el.classList.add('old');
  }
  if (el.dataset.staleAfter && hours > Number(el.dataset.staleAfter)) el.hidden = false;
}
</script>`;

export const renderDashboard = (d: Dashboard): string => {
  const s = d.summary;
  const critical = d.operations.filter((o) => o.critical);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(d.config.suite.name)}: automation dashboard</title><style>${STYLES}</style></head><body><main>
<header class="top"><div><h1>Test automation dashboard</h1><p class="muted">${escapeHtml(d.config.suite.name)} · run #${escapeHtml(s.runNumber)} · ${escapeHtml(s.commit.slice(0, 7))} · ${escapeHtml(s.env)} · <span class="ago" data-time="${escapeHtml(s.date)}"></span></p></div>
<nav>${link(d.links.allure, 'Allure report')}${link(d.links.playwright, 'Playwright report')}${link(d.links.run, 'CI run')}</nav></header>
<section class="row">${suiteCard(d)}<div class="card donut-card"><h3>Latest run</h3>${donut(s.counts)}</div></section>
${kpis(d)}
<section class="row two"><div class="card"><h3>Trend per run</h3><div class="key"><span class="k-pass">Pass rate</span><span class="k-cov">Coverage</span><span class="k-crit">Critical coverage</span></div>${trendChart(d.history)}</div>
<div class="card"><h3>Coverage by method</h3>${methodBars(d.operations, d.config.methods)}<p class="muted small">Operations from the OpenAPI spec with at least one test.</p></div></section>
<section class="card"><h3>Coverage heatmap</h3><p class="muted small">Covered / total operations per resource and method. Darker is more covered; a bold border means negative or auth scenarios exist too.</p><div class="scroll">${heatmap(d)}</div></section>
${knownBugs(d)}
<section class="card"><h3>Critical flows</h3><div class="scroll"><table class="ops"><tr><th>Operation</th><th>Tests</th><th>Depth</th></tr>${critical.map(operationRow).join('')}</table></div></section>
<section class="card"><h3>All operations</h3>${gaps(d)}</section>
<section class="card"><h3>Tests in this run</h3><div class="scroll"><table class="ops"><tr><th>Test</th><th>Tags</th><th>Status</th><th>Time</th></tr>${testRows(d.tests)}</table></div></section>
<p class="muted small foot">Coverage = OpenAPI operations with at least one test, matched by each spec's <code>test.describe('METHOD /path')</code> title. Depth comes from the <code>@negative</code> and <code>@auth</code> tags.</p>
</main>${CLIENT_SCRIPT}</body></html>`;
};
