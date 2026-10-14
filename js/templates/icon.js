// ============================================================
// Template helper: render an SVG sprite reference as a string.
//
// Validates the name against a strict regex so no state-derived
// value can inject arbitrary markup. Returns '' on invalid input,
// which keeps the templates safe by default.
// ============================================================

export function icon(name, className = '') {
  if (typeof name !== 'string' || !/^icon-[a-z0-9-]+$/.test(name)) return '';
  const cls = className ? ` class="${className}"` : '';
  return `<svg${cls} viewBox="0 0 24 24" aria-hidden="true"><use href="./assets/icons.svg#${name}"/></svg>`;
}