// ============================================================
// ModalidadPicker: segmented control para modalidad laboral.
// Opciones: '' (sin definir) / 'presencial' / 'home' / 'hybrid'.
// Cuando se elige "hybrid" se muestra un select con los días
// en oficina (1-4). El resto de los días se asume home.
//
// Los botones deben tener la clase .modalidad-btn + data-value.
// El wrapper visual (segmented control) es .modalidad-seg.
// ============================================================

export const MODALIDAD_VALUES = ['', 'presencial', 'home', 'hybrid'];

export class ModalidadPicker {
  /**
   * @param {HTMLElement} container  contenedor con .modalidad-btn
   * @param {{
   *   hybridWrap?: HTMLElement,
   *   hybridSelect?: HTMLSelectElement,
   *   value?: string,
   *   hybridDays?: number,
   *   onChange?: (value:string, hybridDays:number) => void,
   * }} opts
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.buttons = [...container.querySelectorAll('.modalidad-btn')];
    this.hybridWrap = opts.hybridWrap || null;
    this.hybridSelect = opts.hybridSelect || null;
    this.onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};

    this.value = MODALIDAD_VALUES.includes(opts.value) ? opts.value : '';
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
    const btn = e.target.closest('.modalidad-btn');
    if (!btn || !this.container.contains(btn)) return;
    const value = btn.dataset.value || '';
    this.setValue(value);
  }

  /**
   * @param {string} value
   * @param {number} [hybridDays]  sólo si value === 'hybrid'
   */
  setValue(value, hybridDays) {
    this.value = MODALIDAD_VALUES.includes(value) ? value : '';
    if (hybridDays !== undefined && hybridDays !== null) {
      this.hybridDays = Number(hybridDays) || 3;
    }
    this._render();
    this.onChange(this.value, this.hybridDays);
  }

  /**
   * @returns {{modalidad:string, hybridOfficeDays:number|null}}
   */
  getValue() {
    if (this.value === 'hybrid') {
      return { modalidad: 'hybrid', hybridOfficeDays: this.hybridDays };
    }
    return { modalidad: this.value, hybridOfficeDays: null };
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