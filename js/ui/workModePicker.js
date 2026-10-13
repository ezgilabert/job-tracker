// ============================================================
// WorkModePicker: segmented control for work mode.
// Options: '' (undefined) / 'onsite' / 'remote' / 'hybrid'.
// When "hybrid" is selected, a select for office days (1-4)
// is shown. The remaining days are assumed remote.
//
// Buttons must have class .workmode-btn + data-value.
// The wrapper is .workmode-seg (segmented control).
// ============================================================

export const WORK_MODE_VALUES = ['', 'onsite', 'remote', 'hybrid'];

export class WorkModePicker {
  /**
   * @param {HTMLElement} container  wrapper holding .workmode-btn
   * @param {{
   *   hybridWrap?: HTMLElement,
   *   hybridSelect?: HTMLSelectElement,
   *   value?: string,
   *   hybridDays?: number,
   *   onChange?: (value: string, hybridDays: number) => void,
   * }} opts
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.buttons = [...container.querySelectorAll('.workmode-btn')];
    this.hybridWrap = opts.hybridWrap || null;
    this.hybridSelect = opts.hybridSelect || null;
    this.onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};

    this.value = WORK_MODE_VALUES.includes(opts.value) ? opts.value : '';
    this.hybridDays = Number(opts.hybridDays) || 3;

    this._boundClick = this._onClick.bind(this);
    this.container.addEventListener('click', this._boundClick);

    if (this.hybridSelect) {
      this.hybridSelect.addEventListener('change', () => {
        this.hybridDays = Number(this.hybridSelect.value) || 3;
        this.onChange(this.value, this.hybridDays);
      });
    }

    this._render();
  }

  _onClick(e) {
    const btn = e.target.closest('.workmode-btn');
    if (!btn || !this.container.contains(btn)) return;
    const value = btn.dataset.value || '';
    this.setValue(value);
  }

  /**
   * @param {string} value
   * @param {number} [hybridDays]  only used when value === 'hybrid'
   */
  setValue(value, hybridDays) {
    this.value = WORK_MODE_VALUES.includes(value) ? value : '';
    if (hybridDays !== undefined && hybridDays !== null) {
      this.hybridDays = Number(hybridDays) || 3;
    }
    this._render();
    this.onChange(this.value, this.hybridDays);
  }

  /**
   * @returns {{workMode: string, hybridOfficeDays: number|null}}
   */
  getValue() {
    if (this.value === 'hybrid') {
      return { workMode: 'hybrid', hybridOfficeDays: this.hybridDays };
    }
    return { workMode: this.value, hybridOfficeDays: null };
  }

  _render() {
    this.buttons.forEach(b => {
      b.classList.toggle('selected', (b.dataset.value || '') === this.value);
    });
    if (this.hybridWrap) {
      this.hybridWrap.classList.toggle('visible', this.value === 'hybrid');
    }
    if (this.hybridSelect) {
      this.hybridSelect.value = String(this.hybridDays);
    }
  }

  destroy() {
    this.container.removeEventListener('click', this._boundClick);
  }
}