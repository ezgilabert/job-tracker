// ============================================================
// Dashboard · Style 4 · Compact
// Horizontal chips + distribution bar + legend.
// ============================================================

import { escapeHtml } from './shared.js';

export function renderCompact(container, data) {
  const total = data.total || 0;

  const segments = [
    { key: 'active',    num: data.active,    cls: 's1', label: data.labels.active,    color: 'accent' },
    { key: 'inProcess', num: data.inProcess, cls: 's2', label: data.labels.inProcess, color: 'warning' },
    { key: 'highlight', num: data.highlight, cls: 's3', label: data.highlightLabel,   color: 'success' },
    { key: 'closed',    num: data.closed,    cls: 's4', label: data.labels.closed,    color: 'neutral' },
  ];

  const pct = n => total > 0 ? Math.round((n / total) * 100) : 0;

  const chipsHtml = [
    { num: data.total,     label: data.labels.total,     color: '' },
    { num: data.active,    label: data.labels.active,    color: 'accent' },
    { num: data.inProcess, label: data.labels.inProcess, color: 'warning' },
    { num: data.highlight, label: data.highlightLabel,   color: 'success' },
    { num: data.closed,    label: data.labels.closed,    color: 'neutral' },
  ].map(c => `
    <div class="dash-compact-chip ${c.color}">
      <span class="num">${c.num}</span> ${escapeHtml(c.label)}
    </div>
  `).join('');

  const barHtml = segments
    .filter(s => s.num > 0)
    .map(s => `<div class="dash-compact-bar-seg ${s.cls}" style="width: ${pct(s.num)}%;"></div>`)
    .join('');

  const legendHtml = segments
    .filter(s => s.num > 0)
    .map(s => `<span><span class="dot ${s.cls}"></span>${escapeHtml(s.label)} ${pct(s.num)}%</span>`)
    .join('');

  const el = document.createElement('div');
  el.className = 'dash-compact';
  el.innerHTML = `
    <div class="dash-compact-chips">${chipsHtml}</div>
    <div class="dash-compact-bar">${barHtml}</div>
    <div class="dash-compact-legend">${legendHtml}</div>
  `;

  container.appendChild(el);
}