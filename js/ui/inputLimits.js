// ============================================================
// inputLimits: maxlength helpers, paste sanitizer, char counters
// ============================================================

// Textareas con maxlength >= este umbral reciben un contador visible.
const COUNTER_THRESHOLD = 1000;

/**
 * Se llama una sola vez al boot. Encuentra todos los inputs/textarea
 * dentro de `root` y les engancha:
 *   - Contador de caracteres (solo textareas largas).
 *   - Sanitizador de paste (colapsa saltos de línea en inputs).
 *
 * Los atributos `maxlength` / `minlength` / `pattern` del HTML se
 * respetan nativamente por el navegador.
 */
export function mountInputLimits(root = document) {
  // ---------- 1) Contadores en textareas largas ----------
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
 * Inserta un contador debajo de la textarea y lo mantiene actualizado.
 */
function mountCounter(textarea, max) {
  const counter = document.createElement('div');
  counter.className = 'field-counter';
  counter.setAttribute('aria-live', 'polite');
  counter.setAttribute('aria-atomic', 'true');

  // Insertarlo como hermano de la textarea, dentro del .field
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

  // Si el valor se setea programáticamente (ej. abrir modal de edición),
  // el input event no dispara solo. Observamos el value con un timer.
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
 * Si el usuario pega texto multilínea en un <input> de una sola línea,
 * lo colapsamos a una sola línea y respetamos el maxlength.
 */
function onPasteSingleLine(e) {
  const el = e.target;
  if (el.tagName !== 'INPUT') return;

  const clipboard = (e.clipboardData || window.clipboardData);
  if (!clipboard) return;

  const text = clipboard.getData('text');
  if (!text) return;

  // Si no tiene saltos de línea, no interferimos con el paste nativo.
  if (!/[\r\n\t]/.test(text)) return;

  e.preventDefault();

  const clean = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
  const max = Number(el.getAttribute('maxlength')) || Infinity;

  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);

  el.value = (before + clean + after).slice(0, max);

  // Mover el cursor al final del texto pegado.
  const newPos = Math.min(before.length + clean.length, el.value.length);
  try { el.setSelectionRange(newPos, newPos); } catch {}

  el.dispatchEvent(new Event('input', { bubbles: true }));
}