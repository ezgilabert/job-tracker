// ============================================================
// ContactLinkPicker: chips de plataforma + input de link.
//   - Chips: LinkedIn / Email / WhatsApp / Otro
//   - Cada chip tiene un SVG inline que se clona al ícono del input.
//   - Mantiene un <input type="hidden"> con el tipo seleccionado.
//
// Uso:
//   const picker = new ContactLinkPicker(rootEl, {
//     onChange: ({ tipo, link }) => {},
//   });
//   picker.getValue();               // { tipo: 'linkedin', link: '...' }
//   picker.setValue({ tipo, link });
//   picker.reset();
// ============================================================

export const PLATFORM_VALUES = ['linkedin', 'email', 'whatsapp', 'otro'];
export const DEFAULT_PLATFORM = 'linkedin';

export class ContactLinkPicker {
  /**
   * @param {HTMLElement} rootEl  wrapper .contact-link-picker
   * @param {{ value?: {tipo?:string, link?:string}, onChange?: Function }} opts
   */
  constructor(rootEl, opts = {}) {
    this.root = rootEl;
    this.chipsEl = rootEl.querySelector('.contact-chips');
    this.iconEl = rootEl.querySelector('.platform-icon');
    this.inputEl = rootEl.querySelector('.platform-input input');
    this.hiddenEl = rootEl.querySelector('input[type="hidden"]');

    this.onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};
    this.value = { tipo: DEFAULT_PLATFORM, link: '' };

    // Estado inicial
    if (opts.value) {
      if (opts.value.tipo) this.value.tipo = opts.value.tipo;
      if (opts.value.link) this.value.link = opts.value.link;
    }

    // Listeners
    this._onChipClick = this._onChipClick.bind(this);
    this._onInput = this._onInput.bind(this);

    if (this.chipsEl) this.chipsEl.addEventListener('click', this._onChipClick);
    if (this.inputEl) this.inputEl.addEventListener('input', this._onInput);

    this._renderAll();
  }

  destroy() {
    if (this.chipsEl) this.chipsEl.removeEventListener('click', this._onChipClick);
    if (this.inputEl) this.inputEl.removeEventListener('input', this._onInput);
  }

  // ----------------------------------------------------------
  // API
  // ----------------------------------------------------------
  getValue() {
    return {
      tipo: this.value.tipo,
      link: (this.inputEl?.value || '').trim(),
    };
  }

  setValue({ tipo, link } = {}) {
    if (tipo && PLATFORM_VALUES.includes(tipo)) this.value.tipo = tipo;
    if (link !== undefined) this.value.link = link;
    this._renderAll();
  }

  reset() {
    this.value = { tipo: DEFAULT_PLATFORM, link: '' };
    this._renderAll();
  }

  refresh() {
    this._renderAll();
  }

  // ----------------------------------------------------------
  // Internal
  // ----------------------------------------------------------
  _onChipClick(e) {
    const chip = e.target.closest('.contact-chip');
    if (!chip || !this.chipsEl.contains(chip)) return;
    const tipo = chip.dataset.platform;
    if (!PLATFORM_VALUES.includes(tipo)) return;
    if (tipo === this.value.tipo) return;
    this.value.tipo = tipo;
    this._renderChips();
    this._renderIcon();
    this._emit();
  }

  _onInput() {
    this.value.link = this.inputEl.value;
    this._emit();
  }

  _emit() {
    this.onChange(this.getValue());
  }

  _renderAll() {
    this._renderChips();
    this._renderIcon();
    this._renderInput();
    this._renderHidden();
  }

  _renderChips() {
    if (!this.chipsEl) return;
    this.chipsEl.querySelectorAll('.contact-chip').forEach(c => {
      c.classList.toggle('selected', c.dataset.platform === this.value.tipo);
    });
  }

  _renderIcon() {
    if (!this.chipsEl || !this.iconEl) return;

    const chip = this.chipsEl.querySelector(`.contact-chip[data-platform="${this.value.tipo}"]`);
    if (!chip) return;

    // El ícono es un SVG que vive dentro del chip. Lo clonamos.
    const svg = chip.querySelector('svg');
    this.iconEl.innerHTML = '';
    if (svg) {
      this.iconEl.appendChild(svg.cloneNode(true));
    }

    // Placeholder específico de la plataforma.
    if (this.inputEl) {
      this.inputEl.placeholder = chip.dataset.placeholder || '';
    }
  }

  _renderInput() {
    if (!this.inputEl) return;
    if (this.inputEl.value !== this.value.link) {
      this.inputEl.value = this.value.link;
    }
  }

  _renderHidden() {
    if (!this.hiddenEl) return;
    this.hiddenEl.value = this.value.tipo;
  }
}