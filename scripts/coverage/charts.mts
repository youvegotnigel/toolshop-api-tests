/** Dependency-free SVG/HTML chart helpers for the coverage dashboard. */
import type { OperationCoverage, RunSummary, Status } from './model.mts';
import { STATUSES } from './model.mts';

export const COLORS: Record<Status, string> = {
  passed: '#2f8f5b',
  failed: '#d64045',
  broken: '#c8901c',
  flaky: '#8e6bd8',
  skipped: '#9aa5b1',
};

export const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const y = (value: number, height: number, pad: number): number =>
  pad + (1 - value / 100) * (height - 2 * pad);

/** Small trend line like the reference card: dashed 100% guide, filled area, last point marked. */
export const sparkline = (values: number[], color: string, width = 230, height = 60): string => {
  const pad = 6;
  const series = values.length === 1 ? [values[0] ?? 0, values[0] ?? 0] : values;
  const step = (width - 2 * pad) / Math.max(series.length - 1, 1);
  const points = series.map((v, i) => `${(pad + i * step).toFixed(1)},${y(v, height, pad).toFixed(1)}`);
  const last = points.at(-1)?.split(',') ?? ['0', '0'];
  return `<svg viewBox="0 0 ${String(width)} ${String(height)}" class="spark" role="img" aria-label="pass rate trend">
<line x1="${String(pad)}" x2="${String(width - pad)}" y1="${String(pad)}" y2="${String(pad)}" class="guide"/>
<polygon points="${String(pad)},${String(height - pad)} ${points.join(' ')} ${String(width - pad)},${String(height - pad)}" fill="${color}" opacity="0.1"/>
<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>
<circle cx="${last[0] ?? '0'}" cy="${last[1] ?? '0'}" r="3.5" fill="${color}"/></svg>`;
};

/** Pass rate and coverage per run on a 0 to 100% axis. */
export const trendChart = (history: RunSummary[], width = 640, height = 240): string => {
  const left = 40;
  const pad = 20;
  const step = (width - left - pad) / Math.max(history.length - 1, 1);
  const line = (pick: (r: RunSummary) => number, cls: string): string =>
    `<polyline class="${cls}" fill="none" points="${history
      .map((r, i) => `${(left + i * step).toFixed(1)},${y(pick(r), height - 20, pad).toFixed(1)}`)
      .join(' ')}"/>`;
  const grid = [0, 25, 50, 75, 100]
    .map((v) => {
      const gy = y(v, height - 20, pad).toFixed(1);
      return `<line x1="${String(left)}" x2="${String(width - pad)}" y1="${gy}" y2="${gy}" class="grid"/><text x="${String(left - 8)}" y="${gy}" class="axis" text-anchor="end" dominant-baseline="middle">${String(v)}%</text>`;
    })
    .join('');
  const labels = history
    .map(
      (r, i) =>
        `<text x="${(left + i * step).toFixed(1)}" y="${String(height - 4)}" class="axis" text-anchor="middle">#${escapeHtml(r.runNumber)}</text>`,
    )
    .join('');
  return `<svg viewBox="0 0 ${String(width)} ${String(height)}" class="chart" role="img" aria-label="pass rate and coverage per run">${grid}${line((r) => r.passRate, 'l-pass')}${line((r) => r.coverage, 'l-cov')}${line((r) => r.criticalCoverage, 'l-crit')}${labels}</svg>`;
};

/** Status split as a donut with the total in the middle. */
export const donut = (counts: Record<Status, number>, size = 170): string => {
  const total = STATUSES.reduce((sum, s) => sum + counts[s], 0);
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const arcs = STATUSES.filter((s) => counts[s] > 0)
    .map((s) => {
      const length = (counts[s] / Math.max(total, 1)) * circumference;
      const arc = `<circle r="${radius.toFixed(1)}" cx="${String(size / 2)}" cy="${String(size / 2)}" fill="none" stroke="${COLORS[s]}" stroke-width="22" stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${String(size / 2)} ${String(size / 2)})"/>`;
      offset += length;
      return arc;
    })
    .join('');
  return `<svg viewBox="0 0 ${String(size)} ${String(size)}" class="donut" role="img" aria-label="test status split">${arcs}<text x="50%" y="48%" text-anchor="middle" class="donut-n">${String(total)}</text><text x="50%" y="62%" text-anchor="middle" class="donut-l">tests</text></svg>`;
};

/** Stacked status bar used on the suite card. */
export const statusBar = (counts: Record<Status, number>): string => {
  const total = Math.max(
    STATUSES.reduce((sum, s) => sum + counts[s], 0),
    1,
  );
  return `<div class="stack">${STATUSES.filter((s) => counts[s] > 0)
    .map(
      (s) =>
        `<span style="width:${String((counts[s] / total) * 100)}%;background:${COLORS[s]}" title="${String(counts[s])} ${s}"></span>`,
    )
    .join('')}</div>`;
};

export const coverageColor = (value: number): string => {
  if (value >= 66) return COLORS.passed;
  if (value >= 33) return COLORS.broken;
  return COLORS.failed;
};

/** Covered / total per HTTP method as horizontal bars. */
export const methodBars = (operations: OperationCoverage[], methods: string[]): string =>
  methods
    .map((method) => {
      const ops = operations.filter((o) => o.method === method);
      const covered = ops.filter((o) => o.tests > 0).length;
      const pct = ops.length === 0 ? 0 : (covered / ops.length) * 100;
      return `<div class="mbar"><span class="mname">${method}</span><span class="mtrack"><span style="width:${pct.toFixed(1)}%;background:${coverageColor(pct)}"></span></span><span class="mval">${String(covered)}/${String(ops.length)}</span></div>`;
    })
    .join('');
