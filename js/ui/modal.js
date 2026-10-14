// ============================================================
// Modal: shared lifecycle for every modal overlay.
//
// Handles three things that every modal repeats:
//   - open / close toggle (the `.open` class on the overlay)
//   - click-outside-to-close (overlay click)
//   - Escape-to-close, with correct priority when several
//     modals are stacked (only the top of the stack responds)
//
// The stack ordering matches the order modals were opened, not
// their DOM order, so a nested modal (e.g. unsaved on top of
// config) always wins over its parent.
//
// Callers that need a custom Escape behaviour (like the config
// modal, which routes to tryClose instead of a plain close) can
// pass an `escapeAction` — the stack only calls it for the top
// modal, so the priority logic is preserved.
// ============================================================

// Modals currently open, oldest first. The last entry is "on top".
const stack = [];

/**
 * @param {HTMLElement} el   the .modal-overlay element
 * @param {{
 *   onClose?:        () => void,
 *   onOpen?:         () => void,
 *   closeOnOverlay?: boolean,
 *   closeOnEscape?:  boolean,
 *   escapeAction?:   () => void,
 * }} opts
 * @returns {{ open: () => void, close: () => void, isOpen: () => boolean, destroy: () => void }}
 */
export function createModal(el, {
  onClose = null,
  onOpen = null,
  closeOnOverlay = true,
  closeOnEscape = true,
  escapeAction = null,
} = {}) {
  if (!el) {
    // Defensive stub so a missing modal in the DOM doesn't crash
    // the controller.
    return {
      open: () => {},
      close: () => {},
      isOpen: () => false,
      destroy: () => {},
    };
  }

  const entry = { el, escapeAction: null };

  function open() {
    el.classList.add('open');
    removeFromStack();
    stack.push(entry);
    if (onOpen) onOpen();
  }

  function close() {
    el.classList.remove('open');
    removeFromStack();
    if (onClose) onClose();
  }

  function isOpen() {
    return el.classList.contains('open');
  }

  function removeFromStack() {
    const idx = stack.indexOf(entry);
    if (idx >= 0) stack.splice(idx, 1);
  }

  if (closeOnOverlay) {
    el.addEventListener('click', (e) => {
      // Overlay click closes the modal directly — including
      // through the escape action when one is defined, so a
      // custom Escape handler stays consistent with the click
      // behaviour.
      if (e.target === el) {
        if (entry.escapeAction) entry.escapeAction();
        else close();
      }
    });
  }

  if (closeOnEscape) {
    entry.escapeAction = escapeAction || close;
  }

  return {
    open,
    close,
    isOpen,
    destroy() {
      removeFromStack();
    },
  };
}

// ------------------------------------------------------------
// Global Escape routing.
// Only the top of the stack receives the Escape — either its
// own close (default) or its escapeAction override.
// ------------------------------------------------------------
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const top = stack[stack.length - 1];
  if (!top || !top.escapeAction) return;
  top.escapeAction();
});