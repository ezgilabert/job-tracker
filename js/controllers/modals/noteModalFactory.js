// ============================================================
// Note modal factory.
//
// Both the jobs note modal and the referrals note modal share
// the exact same UI: input, "Save and advance" (disabled until
// non-whitespace), "Continue without note", close X, Escape and
// overlay-click all cancelling the advance.
//
// This factory owns the shared lifecycle. Each caller supplies
// its own DOM elements, computes the subtitle and provides the
// mutation to run on apply.
// ============================================================

import { createModal } from '../../ui/modal.js';

/**
 * @param {{
 *   modalEl:    HTMLElement,
 *   inputEl:    HTMLTextAreaElement,
 *   subtitleEl: HTMLElement,
 *   saveBtn:    HTMLButtonElement,
 *   skipBtn:    HTMLButtonElement,
 *   closeBtn:   HTMLButtonElement,
 * }} els
 * @returns {{
 *   open: (opts: { subtitleHtml: string, onApply: (note: string|null)=>void }) => void,
 *   close: () => void,
 * }}
 */
export function createNoteModalController({
  modalEl, inputEl, subtitleEl, saveBtn, skipBtn, closeBtn,
}) {
  let pending = null;

  const modal = createModal(modalEl, {
    onClose: () => { pending = null; },
  });

  function syncSaveButton() {
    saveBtn.disabled = inputEl.value.trim().length === 0;
  }

  inputEl.addEventListener('input', syncSaveButton);
  syncSaveButton();

  function open({ subtitleHtml, onApply }) {
    pending = { onApply };
    subtitleEl.innerHTML = subtitleHtml;
    inputEl.value = '';
    syncSaveButton();
    modal.open();
    setTimeout(() => inputEl.focus(), 80);
  }

  function apply(note) {
    if (!pending) return;
    const { onApply } = pending;
    // Clear before closing so onClose doesn't double-fire.
    pending = null;
    modal.close();
    onApply(note);
  }

  skipBtn.addEventListener('click', () => apply(null));

  saveBtn.addEventListener('click', () => {
    if (inputEl.value.trim().length === 0) return;
    apply(inputEl.value.trim());
  });

  closeBtn.addEventListener('click', () => modal.close());

  return {
    open,
    close: () => modal.close(),
  };
}