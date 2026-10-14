// ============================================================
// ConfirmModal: reusable confirmation dialog
// ============================================================

import { t } from '../i18n.js';

const modal = document.getElementById('confirmModal');
const titleEl = document.getElementById('confirmTitle');
const messageEl = document.getElementById('confirmMessage');
const btnConfirm = document.getElementById('confirmBtnConfirm');
const btnCancel = document.getElementById('confirmBtnCancel');

let pendingResolve = null;

export function showConfirm({ title, message, confirmText, danger = false }) {
  return new Promise((resolve) => {
    pendingResolve = resolve;

    titleEl.textContent = title;
    messageEl.innerHTML = message;
    btnConfirm.textContent = confirmText || t('confirm.confirm');
    btnCancel.textContent = t('confirm.cancel');

    if (danger) {
      btnConfirm.style.background = 'var(--danger)';
    } else {
      btnConfirm.style.background = 'var(--accent)';
    }

    modal.classList.add('open');
    btnCancel.focus();
  });
}

function hideConfirm() {
  modal.classList.remove('open');
  if (pendingResolve) {
    pendingResolve(false);
    pendingResolve = null;
  }
}

btnCancel.addEventListener('click', hideConfirm);
modal.addEventListener('click', (e) => {
  if (e.target === modal) hideConfirm();
});

btnConfirm.addEventListener('click', () => {
  if (pendingResolve) {
    pendingResolve(true);
    pendingResolve = null;
  }
  modal.classList.remove('open');
});