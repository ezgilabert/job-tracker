// ============================================================
// Toast: short-lived notifications
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
 */
export function showToast(message, icon = '✓', opts = {}) {
  const { duration = 2200 } = opts;
  const container = getContainer();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${escapeHtml(icon)}</span>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}