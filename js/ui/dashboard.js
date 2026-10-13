// ============================================================
// Dashboard: panel de stats que aparece arriba de las listas
// de postulaciones y referidos.
//
// Cada dashboard se envuelve en una card con header propio
// (ícono + título) que lo identifica visualmente como
// "Postulaciones" o "Referidos".
//
// Soporta 6 estilos configurables:
//   - 'sparklines' → 4 cards con mini-gráficos de tendencia
//   - 'modular'    → card destacada + mini-métricas + panel lateral
//   - 'minimal'    → solo números grandes con label, sin gráficos
//   - 'compact'    → chips horizontales + barra de distribución
//   - 'circular'   → anillos de progreso SVG
//   - 'heatmap'    → calendario de actividad tipo GitHub
//
// El resumen (summary) se renderiza SIEMPRE, en cualquier estilo,
// al final del body.
//
// Uso:
//   renderDashboard(container, {
//     style: 'sparklines' | 'modular' | ... ,
//     kind: 'jobs' | 'refs',
//     icon: '📋',
//     label: 'Postulaciones',
//     total, active, closed, inProcess, highlight,
//     highlightLabel, highlightIcon,
//     trend: { total, active, highlight, closed },
//     topLabel, topIcon, top: [{ name, count }],
//     heatmap: [n, n, n, ...],
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

/**
 * Actividad por día para el heatmap. Devuelve un array de N números
 * (uno por día, empezando por el más viejo).
 */
export function buildDailyActivity(items, getDate, days = 60) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const buckets = new Array(days).fill(0);
  for (const it of items) {
    const d = getDate(it);
    if (!d) continue;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) continue;
    dt.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now - dt) / 86400000);
    if (diffDays >= 0 && diffDays < days) {
      buckets[days - 1 - diffDays]++;
    }
  }
  return buckets;
}

// ============================================================
// ESTILO 1 · Sparklines
// ============================================================
function renderSparklines(container, data) {
  const cards = [
    { label: '📋 ' + data.labels.total, num: data.total, values: data.trend.total, color: '#7c5cff', grad: '#a855f7' },
    { label: '🔥 ' + data.labels.active, num: data.active, values: data.trend.active, color: '#f59e0b', grad: '#f97316' },
    { label: data.highlightIcon + ' ' + data.highlightLabel, num: data.highlight, values: data.trend.highlight, color: '#10b981', grad: '#14b8a6' },
    { label: '❌ ' + data.labels.closed, num: data.closed, values: data.trend.closed, color: '#ef4444', grad: '#f87171' },
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
}

// ============================================================
// ESTILO 2 · Modular
// ============================================================
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
        <div class="dash-mod-side-title">${escapeHtml(data.topIcon)} ${escapeHtml(data.topLabel)}</div>
        <div class="dash-mod-empresas">
          ${topItems || `<div class="dash-mod-empty">—</div>`}
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// ESTILO 3 · Minimal
// ============================================================
function renderMinimal(container, data) {
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

// ============================================================
// ESTILO 4 · Compact
// ============================================================
function renderCompact(container, data) {
  const total = data.total || 0;

  const segments = [
    { key: 'active',    num: data.active,           cls: 's1', label: data.labels.active,    color: 'accent' },
    { key: 'inProcess', num: data.inProcess,        cls: 's2', label: data.labels.inProcess, color: 'warning' },
    { key: 'highlight', num: data.highlight,        cls: 's3', label: data.highlightLabel,   color: 'success' },
    { key: 'closed',    num: data.closed,           cls: 's4', label: data.labels.closed,    color: 'neutral' },
  ];

  const pct = n => total > 0 ? Math.round((n / total) * 100) : 0;

  const chipsHtml = [
    { num: data.total, label: data.labels.total, color: '' },
    { num: data.active, label: data.labels.active, color: 'accent' },
    { num: data.inProcess, label: data.labels.inProcess, color: 'warning' },
    { num: data.highlight, label: data.highlightLabel, color: 'success' },
    { num: data.closed, label: data.labels.closed, color: 'neutral' },
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

// ============================================================
// ESTILO 5 · Circular
// ============================================================
function renderCircular(container, data) {
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

// ============================================================
// ESTILO 6 · Heatmap
// ============================================================
function renderHeatmap(container, data) {
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

// ============================================================
// Summary strip (compartido por los 6 estilos)
// ============================================================
function renderSummary(container, data) {
  if (!data.summary) return;

  const strip = document.createElement('div');
  strip.className = 'dash-strip';
  strip.innerHTML = `
    <span class="dash-strip-icon">📈</span>
    <span class="dash-strip-text">${data.summary}</span>
  `;
  container.appendChild(strip);
}

// ============================================================
// Entry point
// ============================================================
export function renderDashboard(container, data) {
  if (!container) return;
  container.innerHTML = '';

  const kind = data.kind === 'refs' ? 'refs' : 'jobs';
  const icon = data.icon || '📊';
  const label = data.label || '';

  // Wrapper con header propio
  const wrapper = document.createElement('div');
  wrapper.className = `dash-labeled ${kind}`;

  const header = document.createElement('div');
  header.className = 'dash-labeled-header';
  header.innerHTML = `
    <div class="dash-labeled-icon">${escapeHtml(icon)}</div>
    <span class="dash-labeled-title">${escapeHtml(label)}</span>
  `;
  wrapper.appendChild(header);

  const body = document.createElement('div');
  body.className = 'dash-labeled-body';

  switch (data.style) {
    case 'modular':  renderModular(body, data);  break;
    case 'minimal':  renderMinimal(body, data);  break;
    case 'compact':  renderCompact(body, data);  break;
    case 'circular': renderCircular(body, data); break;
    case 'heatmap':  renderHeatmap(body, data);  break;
    case 'sparklines':
    default:
      renderSparklines(body, data);
      break;
  }

  // ⭐ El summary va SIEMPRE, para los 6 estilos
  renderSummary(body, data);

  wrapper.appendChild(body);
  container.appendChild(wrapper);
}