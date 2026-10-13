// ============================================================
// Chips: selectable button group (relationship, status, etc.)
// Supports single-select (default) and multi-select (allowMultiple).
// ============================================================

/**
 * @param {HTMLElement} container  wrapper holding .ref-chip buttons
 * @param {{
 *   onChange?: (value: string | string[] | null) => void,
 *   allowMultiple?: boolean,
 * }} opts
 * @returns {{
 *   setValue: (v: string | string[] | null) => void,
 *   getValue: () => string | string[] | null,
 * }}
 */
export function mountChips(container, { onChange = () => {}, allowMultiple = false } = {}) {
  // ---- Initial state from the DOM ----
  let currentValue;

  if (allowMultiple) {
    const initial = [];
    container.querySelectorAll('.ref-chip.selected').forEach(c => {
      if (c.dataset.value) initial.push(c.dataset.value);
    });
    currentValue = initial;
  } else {
    const sel = container.querySelector('.ref-chip.selected');
    currentValue = sel ? sel.dataset.value : null;
  }

  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.ref-chip');
    if (!chip || !container.contains(chip)) return;

    const value = chip.dataset.value;
    if (value === undefined) return;

    // ========================================================
    // MULTI-SELECT: toggle on/off
    // ========================================================
    if (allowMultiple) {
      const set = new Set(currentValue);
      if (set.has(value)) {
        set.delete(value);
        chip.classList.remove('selected');
      } else {
        set.add(value);
        chip.classList.add('selected');
      }
      currentValue = [...set];
      onChange([...currentValue]);
      return;
    }

    // ========================================================
    // SINGLE-SELECT: optional deselect via data-allow-deselect
    // ========================================================
    if (currentValue === value && container.dataset.allowDeselect === 'true') {
      chip.classList.remove('selected');
      currentValue = null;
      onChange(null);
      return;
    }

    container.querySelectorAll('.ref-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    currentValue = value;
    onChange(value);
  });

  return {
    getValue: () => (allowMultiple ? [...currentValue] : currentValue),

    setValue: (v) => {
      if (allowMultiple) {
        const arr = Array.isArray(v) ? v : (v != null && v !== '' ? [v] : []);
        container.querySelectorAll('.ref-chip').forEach(c => {
          c.classList.toggle('selected', arr.includes(c.dataset.value));
        });
        currentValue = [...arr];
        return;
      }

      container.querySelectorAll('.ref-chip').forEach(c => {
        c.classList.toggle('selected', v !== null && c.dataset.value === v);
      });
      currentValue = v;
    },
  };
}