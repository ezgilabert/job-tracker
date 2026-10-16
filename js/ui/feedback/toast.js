// ============================================================
// Toast: short-lived notifications + action toasts.
//
// Plain toast: no interaction, auto-dismisses after `duration`.
// Action toast: shows a single button, resolves on click or
// timeout. Only one action toast should be live at a time — the
// caller (js/app/undo.js) is responsible for that.
//
// The icon parameter accepts two shapes:
//   - A sprite name:  'icon-check'  → renders an <svg><use>
//   - Any string:     '✓'           → renders as text (backwards
//                                      compatible with older call
//                                      sites during migration)
//
// Accessibility: each toast is announced by screen readers via
// `role="status"` + `aria-live="polite"` + `aria-atomic="true"`.
// ============================================================

import { escapeHtml } from '../../app/utils.js';

const CONTAINER_ID = 'toasts';

function getContainer() {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Renders the toast icon slot: SVG sprite reference or plain text.
 * The regex guard prevents any state-derived string from injecting
 * arbitrary markup through the sprite path.
 */
function renderIcon(icon) {
  if (typeof icon !== 'string' || !icon) return '';
  if (/^icon-[a-z0-9-]+$/.test(icon)) {
    return `<svg class="toast-icon" aria-hidden="true" viewBox="0 0 24 24"><use href="./assets/icons.svg#${icon}"/></svg>`;
  }
  return `<span class="toast-icon" aria-hidden="true">${escapeHtml(icon)}</span>`;
}

/**
 * @param {string} message
 * @param {string} icon  sprite name ('icon-check') or short text ('✓')
 * @param {{ duration?: number }} opts
 * @returns {{ dismiss: () => void }}
 */
export function showToast(message, icon = 'icon-check', opts = {}) {
  const { duration = 2200 } = opts;
  const container = getContainer();

  const toast = document.createElement('div');
  toast.className = 'toast';
  // Screen-reader announcement.
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.setAttribute('aria-atomic', 'true');
  toast.innerHTML = `
    ${renderIcon(icon)}
    <span class="toast-message">${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  let dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }

  setTimeout(dismiss, duration);

  return { dismiss };
}

/**
 * Action toast: message + one button.
 *
 * @param {string} message
 * @param {string} icon
 * @param {{
 *   actionLabel: string,
 *   onAction: () => void,
 *   duration?: number,
 * }} opts
 * @returns {{ dismiss: () => void }}
 */
export function showActionToast(message, icon, opts) {
  const { actionLabel, onAction, duration = 5000 } = opts;
  const container = getContainer();

  const toast = document.createElement('div');
  toast.className = 'toast toast-action';
  // Screen-reader announcement (polite so it doesn't interrupt).
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.setAttribute('aria-atomic', 'true');
  toast.style.setProperty('--toast-duration', `${duration}ms`);
  toast.innerHTML = `
    ${renderIcon(icon)}
    <span class="toast-message">${escapeHtml(message)}</span>
    <button type="button" class="toast-action-btn">${escapeHtml(actionLabel)}</button>
  `;
  container.appendChild(toast);

  let resolved = false;
  let dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(timeoutId);
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }

  toast.querySelector('.toast-action-btn').addEventListener('click', () => {
    if (resolved) return;
    resolved = true;
    try {
      onAction();
    } catch (err) {
      console.error('[Toast] action failed', err);
    }
    dismiss();
  });

  const timeoutId = setTimeout(dismiss, duration);

  return { dismiss };
}