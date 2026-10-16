// ============================================================
// Modal: Note on advance (jobs).
//
// Thin wrapper around the shared noteModalFactory. Owns the
// jobs-specific logic: which step is next, and the undo action.
//
// Closing via the X, Escape or overlay click CANCELS the advance.
// Only the Skip and Save buttons apply it.
// ============================================================

import { WORKFLOW_STEPS } from '../../app/constants.js';
import { stepIndex } from '../../app/selectors.js';
import {
  escapeHtml, cloneArray, updateById, withHistoryEntry,
} from '../../app/utils.js';
import { t, tState, tStateShort } from '../../i18n/index.js';
import { withUndo } from '../../app/undo.js';
import { createNoteModalController } from './noteModalFactory.js';

export function mountNoteModal(jobsStore) {
  const controller = createNoteModalController({
    modalEl:    document.getElementById('noteModal'),
    inputEl:    document.getElementById('stepNoteInput'),
    subtitleEl: document.getElementById('noteModalSubtitle'),
    saveBtn:    document.getElementById('saveNote'),
    skipBtn:    document.getElementById('skipNote'),
    closeBtn:   document.getElementById('closeNoteModal'),
  });

  function open(id, opts = {}) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;

    const idx = stepIndex(j.status);
    if (idx < 0) return;

    const nextIdx = idx + 1;
    if (nextIdx >= WORKFLOW_STEPS.length) return;

    const nextStatus = WORKFLOW_STEPS[nextIdx].id;
    const skipCurrent = !!opts.skipCurrent;

    controller.open({
      subtitleHtml: t('note.subtitle', {
        step: escapeHtml(tStateShort(nextStatus)),
        name: escapeHtml(j.company),
      }),
      onApply: (note) => {
        withUndo(
          jobsStore,
          t('toast.advanceTo', { name: j.company, status: tState(nextStatus) }),
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
      },
    });
  }

  return { open, close: controller.close };
}