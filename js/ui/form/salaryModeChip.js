// ============================================================
// SalaryModeChip: "Range / Single" toggle chip inside the salary
// input. Clicking it cycles between the two modes. Also updates
// the field label text (above).
//
// Style: accent-soft background + accent-border + accent text.
// No color change when toggling; only the label text changes.
// ============================================================

import { t } from '../../i18n/index.js';

export const SALARY_MODES = ['range', 'single'];
export const DEFAULT_SALARY_MODE = 'range';

export class SalaryModeChip {
  /**
   * @param {HTMLElement} chipEl  button containing [data-chip-label]
   * @param {{
   *   value?: 'range' | 'single',
   *   fieldLabelEl?: HTMLElement,   label span above the input (optional)
   *   onChange?: (mode: 'range' | 'single') => void,
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

    // Re-render text on language change. Registered after applyI18n
    // so it wins the last word.
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
      ? t('form.salary.toggleToSingle')
      : t('form.salary.toggleToRange');
    this._renderText();
  }

  _renderText() {
    const isRange = this.value === 'range';

    if (this.chipLabel) {
      this.chipLabel.textContent = isRange
        ? t('form.salary.mode.range')
        : t('form.salary.mode.single');
    }

    if (this.fieldLabel) {
      this.fieldLabel.textContent = isRange
        ? t('form.salary')
        : t('form.salary.single');

      // Small swap animation.
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