// ============================================================
// Modal: Note on advance (jobs)
//
// Shown when the user advances a job to the next stage. Lets them
// leave a free-text reminder for the new step.
//
// Closing via the X, Escape or overlay click CANCELS the advance.
// Only the Skip and Save buttons apply it.
//
// The "Save and advance" button is disabled until the textarea
// has at least one non-whitespace character. "Continue without
// note" is always enabled as the escape hatch.
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
  const saveBtn = document.getElementById('saveNote');
  let pending = null;

  const modal = createModal(document.getElementById('noteModal'), {
    onClose: () => { pending = null; },
  });

  // ----------------------------------------------------------
  // Save button guard
  // ----------------------------------------------------------
  // The button is enabled only when the textarea contains at
  // least one non-whitespace character. The "input" event covers
  // typing, pasting and deleting; the manual call inside open()
  // covers the programmatic reset when the modal is reopened.
  function syncSaveButton() {
    saveBtn.disabled = noteInput.value.trim().length === 0;
  }

  noteInput.addEventListener('input', syncSaveButton);

  // Make sure the button starts disabled before the first open,
  // in case the textarea somehow has content from the HTML.
  syncSaveButton();

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
    syncSaveButton();                 // ← reset to disabled on open
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
    // Defensive: if something re-enables the button without
    // content (e.g. a future refactor), bail out instead of
    // saving an empty note.
    if (noteInput.value.trim().length === 0) return;
    apply({ note: noteInput.value.trim() });
    modal.close();
  });

  // The X cancels without applying the advance.
  document.getElementById('closeNoteModal')
    .addEventListener('click', () => modal.close());

  return { open, close: () => modal.close() };
}