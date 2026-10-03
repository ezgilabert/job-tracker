// ============================================================
// Chips: grupo de botones seleccionables (relación, estado, etc.)
// Reemplaza la dupla setupChips / setChipsValue
// ============================================================

/**
 * @param {HTMLElement} container  contenedor con botones .ref-chip
 * @param {{ onChange?: (value:string) => void }} opts
 * @returns {{ setValue: (v:string|null) => void, getValue: () => string|null }}
 */
export function mountChips(container, { onChange = () => {} } = {}) {
  let currentValue = container.querySelector('.ref-chip.selected')?.dataset.value || null;

  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.ref-chip');
    if (!chip || !container.contains(chip)) return;

    const value = chip.dataset.value;
    if (value === undefined) return;

    // Permitir deseleccionar si ya está seleccionado (útil para "relación" opcional)
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
    getValue: () => currentValue,
    setValue: (v) => {
      container.querySelectorAll('.ref-chip').forEach(c => {
        c.classList.toggle('selected', v !== null && c.dataset.value === v);
      });
      currentValue = v;
    },
  };
}