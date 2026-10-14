// ============================================================
// inputLimits: maxlength helpers, paste sanitizer, char counters
// ============================================================

// Textareas with maxlength >= this threshold get a visible counter.
const COUNTER_THRESHOLD = 1000;

/**
 * Called once at boot. Finds every input/textarea inside `root` and
 * attaches:
 *   - A character counter (only on long textareas).
 *   - A paste sanitizer (collapses newlines for inputs).
 *
 * The HTML `maxlength` / `minlength` / `pattern` attributes are
 * handled natively by the browser.
 */
export function mountInputLimits(root = document) {
  // ---------- 1) Counters on long textareas ----------
  root.querySelectorAll('textarea[maxlength]').forEach(ta => {
    if (ta.dataset.counterMounted === 'true') return;
    const max = Number(ta.getAttribute('maxlength'));
    if (!Number.isFinite(max) || max < COUNTER_THRESHOLD) return;

    ta.dataset.counterMounted = 'true';
    mountCounter(ta, max);
  });

  // ---------- 2) Paste sanitizer ----------
  root.querySelectorAll('input[type="text"], input[type="url"], input[type="email"], input[type="search"], input:not([type])')
    .forEach(el => {
      if (el.dataset.pasteMounted === 'true') return;
      el.dataset.pasteMounted = 'true';
      el.addEventListener('paste', onPasteSingleLine);
    });
}

/**
 * Inserts a counter below the textarea and keeps it updated.
 */
function mountCounter(textarea, max) {
  const counter = document.createElement('div');
  counter.className = 'field-counter';
  counter.setAttribute('aria-live', 'polite');
  counter.setAttribute('aria-atomic', 'true');

  const parent = textarea.parentNode;
  parent.appendChild(counter);

  const update = () => {
    const len = textarea.value.length;
    counter.textContent = `${len} / ${max}`;
    counter.classList.toggle('near-limit', len >= max * 0.9 && len < max);
    counter.classList.toggle('at-limit', len >= max);
  };

  update();
  textarea.addEventListener('input', update);
  textarea.addEventListener('change', update);

  // If the value is set programmatically (e.g. opening the edit modal),
  // the input event does not fire. Watch the length with a timer.
  let lastLen = textarea.value.length;
  const observer = setInterval(() => {
    if (textarea.value.length !== lastLen) {
      lastLen = textarea.value.length;
      update();
    }
  }, 400);
  textarea.addEventListener('blur', () => clearInterval(observer));
}

/**
 * If the user pastes multi-line text into a single-line input,
 * collapse it to one line and respect maxlength.
 */
function onPasteSingleLine(e) {
  const el = e.target;
  if (el.tagName !== 'INPUT') return;

  const clipboard = (e.clipboardData || window.clipboardData);
  if (!clipboard) return;

  const text = clipboard.getData('text');
  if (!text) return;

  // If it has no line breaks, don't interfere with native paste.
  if (!/[\r\n\t]/.test(text)) return;

  e.preventDefault();

  const clean = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
  const max = Number(el.getAttribute('maxlength')) || Infinity;

  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);

  el.value = (before + clean + after).slice(0, max);

  // Move the cursor to the end of the pasted text.
  const newPos = Math.min(before.length + clean.length, el.value.length);
  try { el.setSelectionRange(newPos, newPos); } catch {}

  el.dispatchEvent(new Event('input', { bubbles: true }));
}