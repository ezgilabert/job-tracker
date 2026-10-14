// ============================================================
// Dashboard · Style 5 · Circular
// SVG progress rings.
// ============================================================

import { escapeHtml } from './shared.js';

export function renderCircular(container, data) {
  const total = data.total || 0;
  const RADIUS = 30;
  const CIRC = 2 * Math.PI * RADIUS; // ≈ 188.5

  const rings = [
    { num: total,            label: data.labels.total,     color: 'accent',  showPct: false },
    { num: data.active,      label: data.labels.active,    color: 'accent',  showPct: true },
    { num: data.inProcess,   label: data.labels.inProcess, color: 'warning', showPct: true },
    { num: data.highlight,   label: data.highlightLabel,   color: 'success', showPct: true },
    { num: data.closed,      label: data.labels.closed,    color: 'neutral', showPct: true },
  ];

  const el = document.createElement('div');
  el.className = 'dash-circular';

  el.innerHTML = rings.map(r => {
    const pct = total > 0 ? Math.round((r.num / total) * 100) : 0;
    const fillPct = r.showPct ? pct : 100;
    const offset = CIRC * (1 - fillPct / 100);

    return `
      <div class="dash-ring">
        <div class="dash-ring-svg-wrap">
          <svg class="dash-ring-svg" viewBox="0 0 70 70">
            <circle class="dash-ring-bg" cx="35" cy="35" r="${RADIUS}"/>
            <circle class="dash-ring-fg ${r.color}" cx="35" cy="35" r="${RADIUS}"
                    style="stroke-dashoffset: ${offset};"/>
          </svg>
          <div class="dash-ring-center">
            ${r.num}
            <small>${r.showPct ? pct + '%' : escapeHtml(data.labels.total)}</small>
          </div>
        </div>
        <div class="dash-ring-label">${escapeHtml(r.label)}</div>
      </div>
    `;
  }).join('');

  container.appendChild(el);
}