// ============================================================
// Toast: short-lived notifications + action toasts.
//
// Plain toast: no interaction, auto-dismisses after `duration`.
// Action toast: shows a single button, resolves on click or
// timeout. Only one action toast should be live at a time — the
// caller (js/undo.js) is responsible for that.
// ============================================================

import { escapeHtml } from '../utils.js';

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
 * @param {string} message
 * @param {string} icon  short emoji
 * @param {{ duration?: number }} opts
 * @returns {{ dismiss: () => void }}
 */
export function showToast(message, icon = '✓', opts = {}) {
  const { duration = 2200 } = opts;
  const container = getContainer();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${escapeHtml(icon)}</span>
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
 * The button is the only interactive element. Clicking it runs
 * `onAction()` and dismisses the toast. The toast also auto-
 * dismisses after `duration` without running the action.
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
  toast.style.setProperty('--toast-duration', `${duration}ms`);
  toast.innerHTML = `
    <span class="toast-icon">${escapeHtml(icon)}</span>
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