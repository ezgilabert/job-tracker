// ============================================================
// Dashboard · Style 3 · Minimal
// Just big numbers with a label, no charts.
// ============================================================

import { escapeHtml } from './shared.js';

export function renderMinimal(container, data) {
  const items = [
    { num: data.total,     label: data.labels.total,     cls: 'total'   },
    { num: data.active,    label: data.labels.active,    cls: 'active'  },
    { num: data.inProcess, label: data.labels.inProcess, cls: 'warning' },
    { num: data.highlight, label: data.highlightLabel,   cls: 'success' },
    { num: data.closed,    label: data.labels.closed,    cls: 'neutral' },
  ];

  const el = document.createElement('div');
  el.className = 'dash-minimal';
  el.innerHTML = items.map(it => `
    <div class="dash-minimal-item">
      <div class="dash-minimal-num ${it.cls}">${it.num}</div>
      <div class="dash-minimal-label">${escapeHtml(it.label)}</div>
    </div>
  `).join('');

  container.appendChild(el);
}