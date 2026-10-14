// ============================================================
// Modal: Note on advance (jobs)
//
// Shown when the user advances a job to the next stage. Lets them
// leave a free-text reminder for the new step.
//
// Closing via the X, Escape or overlay click CANCELS the advance.
// Only the Skip and Save buttons apply it.
// ============================================================

import { createModal } from '../../ui/modal.js';
import { WORKFLOW_STEPS } from '../../app/constants.js';
import { stepIndex } from '../../app/selectors.js';
import {
  escapeHtml, cloneArray, updateById, withHistoryEntry,
} from '../../app/utils.js';
import { t, tState, tStateShort } from '../../i18n/index.js';
import { withUndo } from '../../app/undo.js';

export function mountNoteModal(jobsStore) {
  const noteInput = document.getElementById('stepNoteInput');
  const subtitle = document.getElementById('noteModalSubtitle');
  let pending = null;

  const modal = createModal(document.getElementById('noteModal'), {
    onClose: () => { pending = null; },
  });

  function open(id, opts = {}) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;

    const idx = stepIndex(j.status);
    if (idx < 0) return;

    const nextIdx = idx + 1;
    if (nextIdx >= WORKFLOW_STEPS.length) return;

    const nextStatus = WORKFLOW_STEPS[nextIdx].id;
    pending = { id, nextStatus, skipCurrent: !!opts.skipCurrent };

    subtitle.innerHTML = t('note.subtitle', {
      step: escapeHtml(tStateShort(nextStatus)),
      name: escapeHtml(j.company),
    });

    noteInput.value = '';
    modal.open();
    setTimeout(() => noteInput.focus(), 80);
  }

  function apply({ note } = {}) {
    if (!pending) return;
    const { id, nextStatus, skipCurrent } = pending;
    const j = jobsStore.get().find(x => x.id === id);
    const name = j?.company ?? '';

    withUndo(
      jobsStore,
      t('toast.advanceTo', { name, status: tState(nextStatus) }),
      () => {
        updateById(jobsStore, id, job => {
          const skipped = cloneArray(job.skipped);
          if (skipCurrent && !skipped.includes(job.status)) skipped.push(job.status);

          return withHistoryEntry(
            job,
            { status: nextStatus, skipped },
            note ? { status: nextStatus, note } : { status: nextStatus }
          );
        });
      },
      skipCurrent ? 'icon-ban' : 'icon-arrow-right'
    );
  }

  document.getElementById('skipNote').addEventListener('click', () => {
    apply({ note: null });
    modal.close();
  });

  document.getElementById('saveNote').addEventListener('click', () => {
    apply({ note: noteInput.value.trim() || null });
    modal.close();
  });

  // The X cancels without applying the advance.
  document.getElementById('closeNoteModal')
    .addEventListener('click', () => modal.close());

  return { open, close: () => modal.close() };
}