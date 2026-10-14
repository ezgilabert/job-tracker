// ============================================================
// Dashboard · Style 1 · Sparklines
// Four cards with mini trend graphs.
// ============================================================

import { escapeHtml, uid, buildSparkPath, icon } from './shared.js';

export function renderSparklines(container, data) {
  const cards = [
    { iconName: 'icon-clipboard',    label: data.labels.total,     num: data.total,     values: data.trend.total,     color: '#8b6cff', grad: '#b975ff' },
    { iconName: 'icon-flame',        label: data.labels.active,    num: data.active,    values: data.trend.active,    color: '#f59e0b', grad: '#f97316' },
    { iconName: data.highlightIcon,  label: data.highlightLabel,   num: data.highlight, values: data.trend.highlight, color: '#10b981', grad: '#14b8a6' },
    { iconName: 'icon-x-circle',     label: data.labels.closed,    num: data.closed,    values: data.trend.closed,    color: '#ef4444', grad: '#f87171' },
  ];

  const grid = document.createElement('div');
  grid.className = 'dash-spark-grid';

  grid.innerHTML = cards.map(c => {
    const path = buildSparkPath(c.values);
    const fillPath = `${path} L 100 32 L 0 32 Z`;
    const gid = uid('spark');

    const first = c.values[0];
    const last = c.values[c.values.length - 1];
    const delta = last - first;
    const deltaPct = first > 0 ? Math.round((delta / first) * 100) : (last > 0 ? 100 : 0);
    const deltaCls = delta > 0 ? 'up' : (delta < 0 ? 'down' : 'flat');
    const deltaIcon = delta > 0 ? '↑' : (delta < 0 ? '↓' : '→');

    return `
      <div class="dash-spark-card">
        <div class="dash-spark-head">
          <div class="dash-spark-label">${icon(c.iconName)}<span>${escapeHtml(c.label)}</span></div>
          <div class="dash-spark-delta ${deltaCls}">${deltaIcon} ${Math.abs(deltaPct)}%</div>
        </div>
        <div class="dash-spark-num">${c.num}</div>
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" class="dash-spark-svg">
          <defs>
            <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${c.grad}" stop-opacity="1"/>
              <stop offset="100%" stop-color="${c.grad}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d="${fillPath}" fill="url(#${gid})" opacity="0.18"/>
          <path d="${path}" fill="none" stroke="${c.color}" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    `;
  }).join('');

  container.appendChild(grid);
}