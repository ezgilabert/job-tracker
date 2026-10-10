// ============================================================
// SalaryModeChip: chip toggle "Rango / Único" dentro del input
// de salario. Al hacer click, cicla entre los dos modos.
// También actualiza el texto del label del campo (arriba).
//
// Estilo: fondo accent-soft + borde accent-border + texto accent.
// Sin cambio de color al alternar. El label solo cambia de texto.
// ============================================================

import { t } from '../i18n.js';

export const SALARY_MODES = ['range', 'single'];
export const DEFAULT_SALARY_MODE = 'range';

export class SalaryModeChip {
  /**
   * @param {HTMLElement} chipEl  botón con [data-chip-label] adentro
   * @param {{
   *   value?: 'range'|'single',
   *   fieldLabelEl?: HTMLElement,  span del label arriba (opcional)
   *   onChange?: (mode: 'range'|'single') => void,
   * }} opts
   */
  constructor(chipEl, opts = {}) {
    this.chip = chipEl;
    this.chipLabel = chipEl.querySelector('[data-chip-label]');
    this.fieldLabel = opts.fieldLabelEl || null;
    this.onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};
    this.value = SALARY_MODES.includes(opts.value) ? opts.value : DEFAULT_SALARY_MODE;

    this._onClick = this._onClick.bind(this);
    this.chip.addEventListener('click', this._onClick);

    // Re-render de textos cuando cambia el idioma.
    // (Después de applyI18n, para ganar la última palabra.)
    this._onI18nChange = () => this._renderText();
    document.addEventListener('i18n-changed', this._onI18nChange);

    this._render();
  }

  _onClick() {
    this.value = this.value === 'range' ? 'single' : 'range';
    this._render();
    this.onChange(this.value);
  }

  setValue(mode) {
    this.value = SALARY_MODES.includes(mode) ? mode : DEFAULT_SALARY_MODE;
    this._render();
    this.onChange(this.value);
  }

  getValue() {
    return this.value;
  }

  _render() {
    this.chip.dataset.mode = this.value;
    this.chip.title = this.value === 'range'
      ? t('form.salario.toggleToSingle')
      : t('form.salario.toggleToRange');
    this._renderText();
  }

  _renderText() {
    const isRange = this.value === 'range';

    if (this.chipLabel) {
      this.chipLabel.textContent = isRange
        ? t('form.salario.mode.range')
        : t('form.salario.mode.single');
    }

    if (this.fieldLabel) {
      this.fieldLabel.textContent = isRange
        ? t('form.salario')
        : t('form.salario.single');

      // Micro animación de swap
      const field = this.fieldLabel.closest('.field');
      if (field) {
        field.classList.remove('label-changing');
        void field.offsetWidth;
        field.classList.add('label-changing');
        setTimeout(() => field.classList.remove('label-changing'), 340);
      }
    }
  }

  destroy() {
    this.chip.removeEventListener('click', this._onClick);
    document.removeEventListener('i18n-changed', this._onI18nChange);
  }
}