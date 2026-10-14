// ============================================================
// Modal: Close job with a reason
// ============================================================

import { showToast } from '../../ui/feedback/toast.js';
import { createModal } from '../../ui/modal.js';
import { CLOSE_REASON_KEYS } from '../../app/constants.js';
import {
  escapeHtml, updateById, withHistoryEntry,
} from '../../app/utils.js';
import { t, tState } from '../../i18n/index.js';
import { withUndo } from '../../app/undo.js';

const UNDO_ICON = {
  Rejected:  'icon-x-circle',
  Ghosted:   'icon-ghost',
  Discarded: 'icon-ban',
  Offer:     'icon-trophy',
};

export function mountCloseJobModal(jobsStore, refsStore) {
  const reasonsEl = document.getElementById('closeReasons');
  const reasonInput = document.getElementById('closeReason');
  let pendingClose = null;

  const modal = createModal(document.getElementById('closeModal'), {
    onClose: () => { pendingClose = null; },
  });

  function open(id, status) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;
    pendingClose = { id, status };

    document.getElementById('closeModalTitle').textContent =
      t('close.titleAs', { status: tState(status) });
    document.getElementById('closeModalSubtitle').innerHTML =
      `<strong>${escapeHtml(j.role)}</strong> · ${escapeHtml(j.company)}`;

    const reasonKeys = CLOSE_REASON_KEYS[status] || [];
    reasonsEl.innerHTML = reasonKeys
      .map(key => {
        const label = t(key);
        return `<button type="button" class="close-reason-chip" data-reason="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
      })
      .join('');

    reasonInput.value = '';
    reasonInput.style.borderColor = '';
    reasonInput.style.boxShadow = '';

    modal.open();
    setTimeout(() => reasonInput.focus(), 100);
  }

  reasonsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.close-reason-chip');
    if (!chip) return;
    reasonsEl.querySelectorAll('.close-reason-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    reasonInput.value = chip.dataset.reason;
    reasonInput.focus();
  });

  reasonInput.addEventListener('input', () => {
    reasonInput.style.borderColor = '';
    reasonInput.style.boxShadow = '';
  });

  document.getElementById('cancelClose').addEventListener('click', () => modal.close());

  document.getElementById('confirmClose').addEventListener('click', () => {
    if (!pendingClose) return;
    const reason = reasonInput.value.trim();
    if (!reason) {
      reasonInput.focus();
      reasonInput.style.borderColor = 'var(--danger)';
      reasonInput.style.boxShadow = '0 0 0 3px var(--danger-soft)';
      showToast(t('toast.needReason'), '!');
      return;
    }

    const { id, status } = pendingClose;
    const closedJob = jobsStore.get().find(x => x.id === id);

    withUndo(
      [jobsStore, refsStore],
      t('toast.closedAs', { status: tState(status) }),
      () => {
        updateById(jobsStore, id, j => withHistoryEntry(
          j,
          status === 'Offer'
            ? { status, offerConfirmed: true }
            : { status },
          { status, reason }
        ));

        if (status === 'Offer') {
          syncLinkedRefToHired(id, closedJob);
        }
      },
      UNDO_ICON[status] || 'icon-check'
    );

    modal.close();
  });

  // Auto-sync: if the closed job was linked to a referral and the
  // close is "Offer", move the referral to "Hired".
  function syncLinkedRefToHired(jobId, job) {
    refsStore.update(refs => refs.map(r => {
      if (r.linkedJobId !== jobId) return r;
      if (r.status === 'Not Applicable') return r;
      if (r.status === 'Hired') return r;

      const label = job
        ? `${job.role || '—'} · ${job.company || '—'}`
        : '—';
      return withHistoryEntry(
        r,
        { status: 'Hired' },
        { status: 'Hired', reason: `Offer accepted: ${label}` }
      );
    }));
  }

  return { open, close: () => modal.close() };
}