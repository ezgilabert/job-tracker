// ============================================================
// ConfirmModal: reusable confirmation dialog.
//
// `showConfirm({ ... })` returns a Promise that resolves to
// `true` when the user confirms and `false` when they cancel,
// dismiss with Escape, or click outside.
//
// Built on top of the shared modal lifecycle so the close
// path (overlay click, Escape) stays in sync with every other
// modal in the app.
// ============================================================

import { t } from '../../i18n/index.js';
import { createModal } from '../modal.js';

const titleEl = document.getElementById('confirmTitle');
const messageEl = document.getElementById('confirmMessage');
const btnConfirm = document.getElementById('confirmBtnConfirm');
const btnCancel = document.getElementById('confirmBtnCancel');

let pendingResolve = null;

const confirmModal = createModal(document.getElementById('confirmModal'), {
  onClose: () => {
    // Any close that wasn't triggered by the confirm button
    // resolves the promise as `false`.
    if (pendingResolve) {
      const resolve = pendingResolve;
      pendingResolve = null;
      resolve(false);
    }
  },
});

export function showConfirm({ title, message, confirmText, danger = false }) {
  return new Promise((resolve) => {
    pendingResolve = resolve;

    titleEl.textContent = title;
    messageEl.innerHTML = message;
    btnConfirm.textContent = confirmText || t('confirm.confirm');
    btnCancel.textContent = t('confirm.cancel');

    btnConfirm.style.background = danger ? 'var(--danger)' : 'var(--accent)';

    confirmModal.open();
    btnCancel.focus();
  });
}

btnCancel.addEventListener('click', () => confirmModal.close());

btnConfirm.addEventListener('click', () => {
  if (!pendingResolve) return;
  // Clear the slot before closing so the onClose handler
  // doesn't override the resolution with `false`.
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve(true);
  confirmModal.close();
});