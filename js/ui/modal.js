// ============================================================
// Modal: shared lifecycle for every modal overlay.
//
//   - open / close toggle (`.open` on the overlay)
//   - click-outside-to-close (overlay click)
//   - Escape-to-close, top-of-stack only
//   - Focus trap: Tab / Shift+Tab stay inside the top-most modal
//   - Restores focus to the element that opened the modal on close
//
// Widgets that consume Escape themselves (role picker, status
// picker) call `e.stopPropagation()` so the modal-level listener
// doesn't also fire.
// ============================================================

const stack = [];

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(root) {
  const nodes = [...root.querySelectorAll(FOCUSABLE_SELECTOR)];
  return nodes.filter(n => !n.hasAttribute('hidden') && n.offsetParent !== null);
}

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
    return {
      open: () => {},
      close: () => {},
      isOpen: () => false,
      destroy: () => {},
    };
  }

  const entry = { el, escapeAction: null };
  let previousActive = null;

  // ------------------------------------------------------------
  // Focus trap (top-of-stack only)
  // ------------------------------------------------------------
  function onKeydown(e) {
    if (e.key !== 'Tab') return;
    if (stack[stack.length - 1] !== entry) return;

    const nodes = getFocusable(el);
    if (nodes.length === 0) {
      e.preventDefault();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !el.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !el.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function open() {
    previousActive = document.activeElement;
    el.classList.add('open');
    removeFromStack();
    stack.push(entry);
    if (onOpen) onOpen();

    document.addEventListener('keydown', onKeydown, true);

    // Auto-focus the first focusable element if the caller
    // hasn't focused one via onOpen.
    requestAnimationFrame(() => {
      if (el.contains(document.activeElement)) return;
      const nodes = getFocusable(el);
      if (nodes.length > 0) nodes[0].focus();
    });
  }

  function close() {
    el.classList.remove('open');
    removeFromStack();
    document.removeEventListener('keydown', onKeydown, true);
    if (onClose) onClose();

    // Restore focus to the trigger, if it's still in the DOM.
    const target = previousActive;
    previousActive = null;
    if (
      target &&
      document.body.contains(target) &&
      typeof target.focus === 'function'
    ) {
      try { target.focus(); } catch { /* noop */ }
    }
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
      // Overlay click routes through the same action as Escape
      // when one is defined, so custom close flows (config →
      // unsaved dialog) stay consistent between the two.
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
      document.removeEventListener('keydown', onKeydown, true);
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