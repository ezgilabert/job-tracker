// ============================================================
// ContactLinkPicker: chips de plataforma + input de link.
//   - Chips: LinkedIn / Email / WhatsApp / Otro
//   - Cada chip tiene un SVG inline que se clona al ícono del input.
//   - Mantiene un <input type="hidden"> con el tipo seleccionado.
//   - Valida el contenido del input según el tipo seleccionado:
//       · mientras tipeás → estado "valid" si pasa (borde verde)
//       · al salir del campo → estado "invalid" si falla (borde rojo)
//       · el submit puede llamar a validate() + markTouched() para bloquear
//
// Uso:
//   const picker = new ContactLinkPicker(rootEl, {
//     onChange: ({ tipo, link }) => {},
//   });
//   picker.getValue();               // { tipo: 'linkedin', link: '...' }
//   picker.setValue({ tipo, link });
//   picker.reset();
//   picker.validate();               // { valid: boolean, errorKey: string|null }
//   picker.markTouched();            // fuerza el render del error (para el submit)
//   picker.focus();                  // enfoca el input
// ============================================================

export const PLATFORM_VALUES = ['linkedin', 'email', 'whatsapp', 'otro'];
export const DEFAULT_PLATFORM = 'linkedin';

// ------------------------------------------------------------
// Validadores por tipo. Devuelven `null` si es válido o una
// clave i18n de error si no.
// ------------------------------------------------------------
const LINK_VALIDATORS = {
  linkedin(value) {
    // Acepta con o sin protocolo, con o sin www.
    const clean = value
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '');
    if (!/^linkedin\.com\/(in|company|pub|school|showcase)\/[\w\-%.]+\/?$/i.test(clean)) {
      return 'form.contactoLink.error.linkedin';
    }
    return null;
  },

  email(value) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      return 'form.contactoLink.error.email';
    }
    return null;
  },

  whatsapp(value) {
    const trimmed = value.trim();
    // Sólo permitimos dígitos, espacios, +, guiones, paréntesis y puntos.
    if (!/^[\d\s+\-().]+$/.test(trimmed)) {
      return 'form.contactoLink.error.whatsapp';
    }
    const digits = trimmed.replace(/[^\d]/g, '');
    if (digits.length < 8) {
      return 'form.contactoLink.error.whatsapp';
    }
    return null;
  },

  otro(value) {
    const v = value.trim();
    if (/^https?:\/\/\S+$/i.test(v)) return null;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return null;
    if (/^(mailto|tel):\S+$/i.test(v)) return null;
    return 'form.contactoLink.error.url';
  },
};

export class ContactLinkPicker {
  /**
   * @param {HTMLElement} rootEl  wrapper .contact-link-picker
   * @param {{ value?: {tipo?:string, link?:string}, onChange?: Function }} opts
   */
  constructor(rootEl, opts = {}) {
    this.root = rootEl;
    this.chipsEl = rootEl.querySelector('.contact-chips');
    this.iconEl = rootEl.querySelector('.platform-icon');
    this.wrapEl = rootEl.querySelector('.platform-input');
    this.inputEl = rootEl.querySelector('.platform-input input');
    this.errorEl = rootEl.querySelector('.contact-link-error');
    this.hiddenEl = rootEl.querySelector('input[type="hidden"]');

    this.onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};
    this.value = { tipo: DEFAULT_PLATFORM, link: '' };

    // Sólo mostramos error rojo cuando el usuario ya "tocó" el campo
    // (blur) o cuando el submit lo fuerza con markTouched().
    this.touched = false;

    // Estado inicial
    if (opts.value) {
      if (opts.value.tipo) this.value.tipo = opts.value.tipo;
      if (opts.value.link) this.value.link = opts.value.link;
    }

    // Listeners
    this._onChipClick = this._onChipClick.bind(this);
    this._onInput = this._onInput.bind(this);
    this._onBlur = this._onBlur.bind(this);

    if (this.chipsEl) this.chipsEl.addEventListener('click', this._onChipClick);
    if (this.inputEl) this.inputEl.addEventListener('input', this._onInput);
    if (this.inputEl) this.inputEl.addEventListener('blur', this._onBlur);

    this._renderAll();
  }

  destroy() {
    if (this.chipsEl) this.chipsEl.removeEventListener('click', this._onChipClick);
    if (this.inputEl) {
      this.inputEl.removeEventListener('input', this._onInput);
      this.inputEl.removeEventListener('blur', this._onBlur);
    }
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
    this.touched = false;
    this._renderAll();
  }

  reset() {
    this.value = { tipo: DEFAULT_PLATFORM, link: '' };
    this.touched = false;
    this._renderAll();
  }

  refresh() {
    this._renderAll();
  }

  /**
   * Valida el link según el tipo. No muestra error, sólo lo calcula.
   * @returns {{ valid: boolean, errorKey: string|null }}
   */
  validate() {
    const link = (this.inputEl?.value || '').trim();

    // Vacío = válido (el campo es opcional).
    if (!link) return { valid: true, errorKey: null };

    const fn = LINK_VALIDATORS[this.value.tipo];
    if (!fn) return { valid: true, errorKey: null };

    const errorKey = fn(link);
    return { valid: errorKey === null, errorKey };
  }

  /** Fuerza el render del error (usar desde el submit). */
  markTouched() {
    this.touched = true;
    this._renderValidation();
  }

  focus() {
    this.inputEl?.focus();
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
    this._renderValidation();
    this._emit();
  }

  _onInput() {
    this.value.link = this.inputEl.value;
    this._renderValidation();
    this._emit();
  }

  _onBlur() {
    this.touched = true;
    this._renderValidation();
  }

  _emit() {
    this.onChange(this.getValue());
  }

  _renderAll() {
    this._renderChips();
    this._renderIcon();
    this._renderInput();
    this._renderHidden();
    this._renderValidation();
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

    const svg = chip.querySelector('svg');
    this.iconEl.innerHTML = '';
    if (svg) {
      this.iconEl.appendChild(svg.cloneNode(true));
    }

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

  /**
   * Estado visual:
   *   - valid    → borde/ícono verde (el valor pasa la validación)
   *   - invalid  → borde/ícono rojo + mensaje (falla y el usuario ya tocó el campo)
   *   - ''       → neutral
   */
  _renderValidation() {
    if (!this.inputEl || !this.wrapEl) return;

    const { valid, errorKey } = this.validate();
    const hasValue = (this.inputEl.value || '').trim().length > 0;

    let state = '';
    if (hasValue && valid) {
      state = 'valid';
    } else if (hasValue && !valid && this.touched) {
      state = 'invalid';
    }

    this.wrapEl.classList.toggle('valid', state === 'valid');
    this.wrapEl.classList.toggle('invalid', state === 'invalid');

    if (this.errorEl) {
      if (state === 'invalid' && errorKey) {
        this.errorEl.textContent = this._t(errorKey);
        this.errorEl.classList.add('visible');
      } else {
        this.errorEl.textContent = '';
        this.errorEl.classList.remove('visible');
      }
    }
  }

  /**
   * Resuelve la traducción sin importar i18n.js aquí (evita ciclo).
   * El consumidor puede pisar `this.translate` si quiere otra fuente.
   */
  _t(key) {
    if (typeof this.translate === 'function') {
      try { return this.translate(key); } catch { /* noop */ }
    }
    return key;
  }
}