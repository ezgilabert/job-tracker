// ============================================================
// Dashboard: shared utilities used by every style.
//
// Trend/activity helpers live in js/selectors.js now — they are
// derivations of state, not dashboard presentation.
// ============================================================

import { escapeHtml } from '../../utils.js';

// ------------------------------------------------------------
// Small uid helper (for unique SVG gradient ids)
// ------------------------------------------------------------
export function uid(prefix = 'd') {
  return prefix + '-' + Math.random().toString(36).slice(2, 9);
}

/**
 * Builds the SVG path for a sparkline from an array of numbers.
 * Smooth curve using quadratic segments between points.
 */
export function buildSparkPath(values, width = 100, height = 32) {
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
 * Summary strip shown below the dashboard body (all 6 styles).
 * The `data.summary` field is trusted HTML (built by the caller
 * via i18n with escaped placeholders).
 */
export function renderSummary(container, data) {
  if (!data.summary) return;

  const strip = document.createElement('div');
  strip.className = 'dash-strip';
  strip.innerHTML = `
    <span class="dash-strip-icon">📈</span>
    <span class="dash-strip-text">${data.summary}</span>
  `;
  container.appendChild(strip);
}

// Re-export so style files can build strings in one place.
export { escapeHtml };