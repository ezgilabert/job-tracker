// ============================================================
// Dashboard · Style 6 · Heatmap
// GitHub-style activity calendar.
// ============================================================

import { escapeHtml } from './shared.js';

export function renderHeatmap(container, data) {
  const days = Array.isArray(data.heatmap) ? data.heatmap : [];
  const max = Math.max(...days, 1);

  const level = n => {
    if (n <= 0) return 0;
    const p = n / max;
    if (p <= 0.25) return 1;
    if (p <= 0.50) return 2;
    if (p <= 0.75) return 3;
    return 4;
  };

  const cells = days.map(n => `<div class="dash-heatmap-cell l${level(n)}"></div>`).join('');

  const el = document.createElement('div');
  el.className = 'dash-heatmap';

  el.innerHTML = `
    <div class="dash-heatmap-top">
      <div class="dash-heatmap-stats">
        <div class="dash-heatmap-stat">
          <div class="num">${data.total}</div>
          <div class="lbl">${escapeHtml(data.labels.total)}</div>
        </div>
        <div class="dash-heatmap-stat">
          <div class="num accent">${data.active}</div>
          <div class="lbl">${escapeHtml(data.labels.active)}</div>
        </div>
        <div class="dash-heatmap-stat">
          <div class="num success">${data.highlight}</div>
          <div class="lbl">${escapeHtml(data.highlightLabel)}</div>
        </div>
      </div>
    </div>

    <div class="dash-heatmap-grid">${cells}</div>

    <div class="dash-heatmap-legend">
      <span>—</span>
      <span class="cell l0"></span>
      <span class="cell l1"></span>
      <span class="cell l2"></span>
      <span class="cell l3"></span>
      <span class="cell l4"></span>
      <span>+</span>
    </div>
  `;

  container.appendChild(el);
}