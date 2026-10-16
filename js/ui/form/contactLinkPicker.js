// ============================================================
// ContactLinkPicker: platform chips + link input.
//   - Chips: LinkedIn / Email / WhatsApp / Other
//   - Each chip has an inline SVG that gets cloned into the
//     input icon.
//   - Keeps a hidden input with the selected platform.
//   - Validates the input content based on the selected platform:
//       · while typing    → "valid" state if it passes (green border)
//       · on field blur   → "invalid" state if it fails (red border)
//       · submit can call validate() + markTouched() to block.
//
// Usage:
//   const picker = new ContactLinkPicker(rootEl, {
//     onChange: ({ platform, link }) => {},
//   });
//   picker.getValue();               // { platform: 'linkedin', link: '...' }
//   picker.setValue({ platform, link });
//   picker.reset();
//   picker.validate();               // { valid, errorKey }
//   picker.markTouched();            // force error rendering (submit)
//   picker.focus();                  // focus the input
// ============================================================

export const PLATFORM_VALUES = ['linkedin', 'email', 'whatsapp', 'other'];
export const DEFAULT_PLATFORM = 'linkedin';

import { validateContactLink, LINK_VALIDATORS } from '../../app/validators.js';

export { LINK_VALIDATORS };

export class ContactLinkPicker {
  /**
   * @param {HTMLElement} rootEl  wrapper .contact-link-picker
   * @param {{ value?: {platform?: string, link?: string}, onChange?: Function }} opts
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
    this.value = { platform: DEFAULT_PLATFORM, link: '' };

    // Only show a red error after the user has "touched" the field
    // (blur) or the submit forces it with markTouched().
    this.touched = false;

    // Initial state.
    if (opts.value) {
      if (opts.value.platform) this.value.platform = opts.value.platform;
      if (opts.value.link) this.value.link = opts.value.link;
    }

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
      platform: this.value.platform,
      link: (this.inputEl?.value || '').trim(),
    };
  }

  setValue({ platform, link } = {}) {
    if (platform && PLATFORM_VALUES.includes(platform)) this.value.platform = platform;
    if (link !== undefined) this.value.link = link;
    this.touched = false;
    this._renderAll();
  }

  reset() {
    this.value = { platform: DEFAULT_PLATFORM, link: '' };
    this.touched = false;
    this._renderAll();
  }

  refresh() {
    this._renderAll();
  }

  /**
   * Validates the link against the selected platform. Does not
   * render anything; only computes.
   * @returns {{ valid: boolean, errorKey: string | null }}
   */
  validate() {
    const link = (this.inputEl?.value || '').trim();
    const res = validateContactLink(this.value.platform, link);
    return { valid: res.valid, errorKey: res.errorKey || null };
  }

  /** Forces error rendering (call from the submit handler). */
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
    const platform = chip.dataset.platform;
    if (!PLATFORM_VALUES.includes(platform)) return;
    if (platform === this.value.platform) return;
    this.value.platform = platform;
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
      c.classList.toggle('selected', c.dataset.platform === this.value.platform);
    });
  }

  _renderIcon() {
    if (!this.chipsEl || !this.iconEl) return;

    const chip = this.chipsEl.querySelector(`.contact-chip[data-platform="${this.value.platform}"]`);
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
    this.hiddenEl.value = this.value.platform;
  }

  /**
   * Visual state:
   *   - valid    → green border/icon (value passes validation)
   *   - invalid  → red border/icon + message (fails and user touched)
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
   * Resolves the translation without importing i18n.js here (avoids
   * a cycle). The consumer can override `this.translate`.
   */
  _t(key) {
    if (typeof this.translate === 'function') {
      try { return this.translate(key); } catch { /* noop */ }
    }
    return key;
  }
}