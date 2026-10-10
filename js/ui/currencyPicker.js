// ============================================================
// CurrencyPicker: chip de moneda (ARS/USD) que vive dentro
// del input de salario. Toggle simple de dos estados.
// ============================================================

export const CURRENCY_VALUES = ['ars', 'usd'];
export const DEFAULT_CURRENCY = 'usd';

export class CurrencyPicker {
  /**
   * @param {HTMLElement} container  contenedor con [data-cur] buttons
   * @param {{
   *   value?: 'ars'|'usd',
   *   onChange?: (value:string) => void,
   * }} opts
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.buttons = [...container.querySelectorAll('[data-cur]')];
    this.onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};
    this.value = CURRENCY_VALUES.includes(opts.value) ? opts.value : DEFAULT_CURRENCY;

    this._boundClick = this._onClick.bind(this);
    this.container.addEventListener('click', this._boundClick);

    this._render();
  }

  _onClick(e) {
    const btn = e.target.closest('[data-cur]');
    if (!btn || !this.container.contains(btn)) return;
    const value = btn.dataset.cur;
    if (!CURRENCY_VALUES.includes(value)) return;
    this.setValue(value);
  }

  /**
   * @param {'ars'|'usd'} value
   */
  setValue(value) {
    this.value = CURRENCY_VALUES.includes(value) ? value : DEFAULT_CURRENCY;
    this._render();
    this.onChange(this.value);
  }

  getValue() {
    return this.value;
  }

  _render() {
    this.buttons.forEach(b => {
      b.classList.toggle('active', b.dataset.cur === this.value);
    });
  }

  destroy() {
    this.container.removeEventListener('click', this._boundClick);
  }
}