// ============================================================
// Boot: keyboard shortcuts.
//
// Shortcuts only fire when the user is NOT typing in an input,
// textarea, select or contentEditable element, and when no
// modifier key (Ctrl/Cmd/Alt) is held down.
//
//   n  → expand the new-application form and focus Company
//   /  → focus the applications search box
// ============================================================

function isTypingContext(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

function expandJobForm() {
  const body = document.getElementById('jobFormBody');
  const btn = document.getElementById('jobFormToggleBtn');
  if (body && body.classList.contains('collapsed')) {
    body.classList.remove('collapsed');
    if (btn) btn.classList.remove('collapsed');
  }
}

function focusSmooth(el) {
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => el.focus(), 100);
}

function focusNewApplication() {
  expandJobForm();
  focusSmooth(document.getElementById('company'));
}

function focusJobSearch() {
  focusSmooth(document.getElementById('jobSearch'));
}

export function mountKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingContext(e.target)) return;

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      focusNewApplication();
      return;
    }

    if (e.key === '/') {
      e.preventDefault();
      focusJobSearch();
    }
  });
}