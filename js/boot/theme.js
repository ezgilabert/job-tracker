// ============================================================
// Boot: theme toggle + radial ripple + brand logo.
// ============================================================

import {
  STORAGE_KEYS, LOGO_OPTIONS,
} from '../app/constants.js';

/**
 * Mounts the theme toggle button. Reads the persisted theme on
 * boot and wires the toggle with a radial ripple animation
 * centered on the click point.
 */
export function mountTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';

    const rect = btn.getBoundingClientRect();
    const x = (typeof e.clientX === 'number' && e.clientX > 0)
      ? e.clientX
      : rect.left + rect.width / 2;
    const y = (typeof e.clientY === 'number' && e.clientY > 0)
      ? e.clientY
      : rect.top + rect.height / 2;

    triggerThemeRipple(x, y, next, () => {
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEYS.THEME, next);
    });
  });
}

/**
 * Plays a radial wipe from (x, y) and calls onPeak halfway through
 * so the theme attribute flips while the ripple is still growing.
 *
 * When the OS-level "Reduce motion" setting is on, skip the ripple
 * entirely and call onPeak synchronously. The theme still flips —
 * the user just doesn't get the expanding gradient animation.
 *
 * @param {number} x
 * @param {number} y
 * @param {string} nextTheme
 * @param {() => void} onPeak
 */
export function triggerThemeRipple(x, y, nextTheme, onPeak) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    if (typeof onPeak === 'function') onPeak();
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const dx = Math.max(x, vw - x);
  const dy = Math.max(y, vh - y);
  const radius = Math.sqrt(dx * dx + dy * dy) * 1.05;
  const size = radius * 2;

  const ripple = document.createElement('div');
  ripple.className = 'theme-ripple';
  ripple.style.width  = size + 'px';
  ripple.style.height = size + 'px';
  ripple.style.left   = (x - radius) + 'px';
  ripple.style.top    = (y - radius) + 'px';

  document.body.appendChild(ripple);
  void ripple.offsetWidth;
  ripple.classList.add('run');

  setTimeout(() => {
    if (typeof onPeak === 'function') onPeak();
  }, 380);

  setTimeout(() => {
    ripple.remove();
  }, 900);
}

/**
 * Renders the configured logo into #brandLogo.
 * Falls back to the first option if the id is unknown.
 *
 * @param {string} logoId
 */
export function applyLogo(logoId) {
  const el = document.getElementById('brandLogo');
  if (!el) return;
  const option = LOGO_OPTIONS.find(o => o.id === logoId) || LOGO_OPTIONS[0];
  el.innerHTML = option.svg;
}