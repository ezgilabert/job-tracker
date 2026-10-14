// ============================================================
// Icons: emit an SVG sprite reference.
//
// Single source of truth for the `icon()` helper. Every module
// that used to define its own local copy imports from here.
//
// The name is validated against a strict regex before being
// interpolated into the `<use href>` path, so no state-derived
// value can inject arbitrary markup through the sprite.
// ============================================================

const ICON_NAME = /^icon-[a-z0-9-]+$/;
const SPRITE_URL = './assets/icons.svg';

/**
 * @param {string} name        sprite symbol id, e.g. 'icon-clipboard'
 * @param {string} [className] optional class on the <svg>
 * @returns {string} inline HTML, or '' if the name is invalid
 */
export function icon(name, className = '') {
  if (typeof name !== 'string' || !ICON_NAME.test(name)) return '';
  const cls = className ? ` class="${className}"` : '';
  return `<svg${cls} viewBox="0 0 24 24" aria-hidden="true"><use href="${SPRITE_URL}#${name}"/></svg>`;
}