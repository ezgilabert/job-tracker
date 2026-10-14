// ============================================================
// Dashboard · Style 2 · Modular
// Featured card + mini metrics + side panel with top entries.
// ============================================================

import { escapeHtml, icon } from './shared.js';

export function renderModular(container, data) {
  const ranks = ['top1', 'top2', 'top3', '', ''];

  const topItems = (data.top || []).slice(0, 5).map((it, i) => `
    <div class="dash-mod-company-row">
      <div class="dash-mod-company-pos ${ranks[i] || ''}">${i + 1}</div>
      <div class="dash-mod-company-name">${escapeHtml(it.name)}</div>
      <div class="dash-mod-company-count">${it.count}</div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="dash-mod-grid">
      <div class="dash-mod-big">
        <div class="dash-mod-big-icon">${icon(data.highlightIcon)}</div>
        <div class="dash-mod-big-info">
          <div class="dash-mod-big-lbl">${escapeHtml(data.highlightLabel)}</div>
          <div class="dash-mod-big-num">${data.highlight}</div>
          <div class="dash-mod-big-sub">${escapeHtml(data.highlightSub || '')}</div>
        </div>
      </div>

      <div class="dash-mod-mini m1">
        <div class="dash-mod-mini-lbl">${icon('icon-clipboard')}<span>${escapeHtml(data.labels.total)}</span></div>
        <div class="dash-mod-mini-num">${data.total}</div>
      </div>

      <div class="dash-mod-mini m2">
        <div class="dash-mod-mini-lbl">${icon('icon-flame')}<span>${escapeHtml(data.labels.active)}</span></div>
        <div class="dash-mod-mini-num">${data.active}</div>
      </div>

      <div class="dash-mod-mini m3">
        <div class="dash-mod-mini-lbl">${icon('icon-clock')}<span>${escapeHtml(data.labels.inProcess)}</span></div>
        <div class="dash-mod-mini-num">${data.inProcess}</div>
      </div>

      <div class="dash-mod-mini m4">
        <div class="dash-mod-mini-lbl">${icon('icon-x-circle')}<span>${escapeHtml(data.labels.closed)}</span></div>
        <div class="dash-mod-mini-num">${data.closed}</div>
      </div>

      <div class="dash-mod-side">
        <div class="dash-mod-side-title">${icon(data.topIcon)}<span>${escapeHtml(data.topLabel)}</span></div>
        <div class="dash-mod-companies">
          ${topItems || `<div class="dash-mod-empty">—</div>`}
        </div>
      </div>
    </div>
  `;
}