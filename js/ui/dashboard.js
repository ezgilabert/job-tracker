// ============================================================
// Dashboard: panel de stats que aparece arriba de las listas
// de postulaciones y referidos.
//
// Soporta 2 estilos configurables:
//   - 'sparklines'  → 4 cards con mini-gráficos de tendencia
//   - 'modular'     → card destacada + 4 mini-métricas + panel lateral
//
// Uso:
//   renderDashboard(container, {
//     style: 'sparklines' | 'modular',
//     total, active, closed, inProcess, highlight,
//     highlightLabel, highlightIcon,
//     trend: { total, active, highlight, closed },
//     topLabel, topIcon, top: [{ name, count }],
//     summary,
//   });
// ============================================================

import { escapeHtml } from '../utils.js';

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------
function uid(prefix = 'd') {
  return prefix + '-' + Math.random().toString(36).slice(2, 9);
}

function buildSparkPath(values, width = 100, height = 32) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = width / Math.max(values.length - 1, 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return [x, y];
  });

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const cx = (x0 + x1) / 2;
    d += ` Q ${cx} ${y0} ${cx} ${(y0 + y1) / 2}`;
    d += ` Q ${cx} ${y1} ${x1} ${y1}`;
  }
  return d;
}

/**
 * Trend semanal acumulativo: devuelve N puntos, cada uno con la
 * cantidad de items que ya existían al final de esa semana.
 */
export function buildWeeklyTrend(items, getDate, weeks = 4) {
  const now = Date.now();
  const points = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const cutoff = now - i * 7 * 86400000;
    let count = 0;
    for (const it of items) {
      const d = getDate(it);
      if (!d) continue;
      const ts = new Date(d).getTime();
      if (!isNaN(ts) && ts <= cutoff) count++;
    }
    points.push(count);
  }
  return points;
}

// ------------------------------------------------------------
// V3 · Sparklines
// ------------------------------------------------------------
function renderSparklines(container, data) {
  const cards = [
    {
      label: '📋 ' + data.labels.total,
      num: data.total,
      values: data.trend.total,
      color: '#7c5cff', grad: '#a855f7',
    },
    {
      label: '🔥 ' + data.labels.active,
      num: data.active,
      values: data.trend.active,
      color: '#f59e0b', grad: '#f97316',
    },
    {
      label: data.highlightIcon + ' ' + data.highlightLabel,
      num: data.highlight,
      values: data.trend.highlight,
      color: '#10b981', grad: '#14b8a6',
    },
    {
      label: '❌ ' + data.labels.closed,
      num: data.closed,
      values: data.trend.closed,
      color: '#ef4444', grad: '#f87171',
    },
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
          <div class="dash-spark-label">${escapeHtml(c.label)}</div>
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

  if (data.summary) {
    const strip = document.createElement('div');
    strip.className = 'dash-strip';
    strip.innerHTML = `
      <span class="dash-strip-icon">📈</span>
      <span class="dash-strip-text">${data.summary}</span>
    `;
    container.appendChild(strip);
  }
}

// ------------------------------------------------------------
// V4 · Modular (card destacada + mini-stats + panel lateral)
// ------------------------------------------------------------
function renderModular(container, data) {
  const ranks = ['top1', 'top2', 'top3', '', ''];

  const topItems = (data.top || []).slice(0, 5).map((it, i) => `
    <div class="dash-mod-emp-row">
      <div class="dash-mod-emp-pos ${ranks[i] || ''}">${i + 1}</div>
      <div class="dash-mod-emp-name">${escapeHtml(it.name)}</div>
      <div class="dash-mod-emp-count">${it.count}</div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="dash-mod-grid">
      <div class="dash-mod-big">
        <div class="dash-mod-big-icon">${escapeHtml(data.highlightIcon)}</div>
        <div class="dash-mod-big-info">
          <div class="dash-mod-big-lbl">${escapeHtml(data.highlightLabel)}</div>
          <div class="dash-mod-big-num">${data.highlight}</div>
          <div class="dash-mod-big-sub">${escapeHtml(data.highlightSub || '')}</div>
        </div>
      </div>

      <div class="dash-mod-mini m1">
        <div class="dash-mod-mini-lbl">📋 ${escapeHtml(data.labels.total)}</div>
        <div class="dash-mod-mini-num">${data.total}</div>
      </div>

      <div class="dash-mod-mini m2">
        <div class="dash-mod-mini-lbl">🔥 ${escapeHtml(data.labels.active)}</div>
        <div class="dash-mod-mini-num">${data.active}</div>
      </div>

      <div class="dash-mod-mini m3">
        <div class="dash-mod-mini-lbl">💼 ${escapeHtml(data.labels.inProcess)}</div>
        <div class="dash-mod-mini-num">${data.inProcess}</div>
      </div>

      <div class="dash-mod-mini m4">
        <div class="dash-mod-mini-lbl">❌ ${escapeHtml(data.labels.closed)}</div>
        <div class="dash-mod-mini-num">${data.closed}</div>
      </div>

      <div class="dash-mod-side">
        <div class="dash-mod-side-title">
          ${escapeHtml(data.topIcon)} ${escapeHtml(data.topLabel)}
        </div>
        <div class="dash-mod-empresas">
          ${topItems || `<div class="dash-mod-empty">—</div>`}
        </div>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------
// Entry point
// ------------------------------------------------------------
export function renderDashboard(container, data) {
  if (!container) return;
  container.innerHTML = '';
  if (data.style === 'modular') {
    renderModular(container, data);
  } else {
    renderSparklines(container, data);
  }
}