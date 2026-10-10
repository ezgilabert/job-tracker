// ============================================================
// EstadoCombo: custom dropdown para elegir el estado inicial.
// Mismo lenguaje visual que PuestoCombo: íconos, hover,
// selected, highlighted, apertura con chevron rotado.
//
// Internamente mantiene un <input type="hidden" id="estado">
// para que el resto del form lo lea como siempre.
// ============================================================

import { WORKFLOW_STEPS, getStateIcon } from '../constants.js';
import { escapeHtml } from '../utils.js';
import { tState } from '../i18n.js';

export class EstadoCombo {
  /**
   * @param {HTMLElement} comboEl  root .combo
   * @param {{
   *   getStates?: () => string[],
   *   getDefault?: () => string,
   *   onChange?: (value: string) => void,
   * }} opts
   */
  constructor(comboEl, opts = {}) {
    this.combo = comboEl;
    this.hiddenInput = comboEl.querySelector('input[type="hidden"]');
    this.trigger = comboEl.querySelector('.combo-trigger');
    this.triggerIcon = comboEl.querySelector('.combo-trigger-icon');
    this.triggerText = comboEl.querySelector('.combo-trigger-text');
    this.dropdown = comboEl.querySelector('.combo-dropdown');

    this.getStates = opts.getStates || (() => WORKFLOW_STEPS.map(s => s.id));
    this.getDefault = opts.getDefault || (() => 'Aplicado');
    this.onChange = opts.onChange || (() => {});

    this.open = false;
    this.value = '';

    this._init();
    this.reset();
  }

  _init() {
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this._outsideClick = (e) => {
      if (this.open && !this.combo.contains(e.target)) this.hide();
    };
    document.addEventListener('click', this._outsideClick);

    this.dropdown.addEventListener('mousedown', (e) => e.preventDefault());
    this.dropdown.addEventListener('click', (e) => {
      const opt = e.target.closest('.combo-option');
      if (!opt) return;
      this.selectValue(opt.dataset.value);
    });

    this.trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
        this.trigger.blur();
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (!this.open) this.show();
      }
    });
  }

  destroy() {
    document.removeEventListener('click', this._outsideClick);
  }

  reset() {
    const def = this.getDefault();
    this.setValue(def, { silent: true });
  }

  toggle() {
    this.open ? this.hide() : this.show();
  }

  show() {
    if (this.open) return;
    this.open = true;
    this.combo.classList.add('open');
    this.trigger.setAttribute('aria-expanded', 'true');
    this._renderOptions();
  }

  hide() {
    this.open = false;
    this.combo.classList.remove('open');
    this.trigger.setAttribute('aria-expanded', 'false');
  }

  selectValue(value) {
    this.setValue(value);
    this.hide();
  }

  setValue(value, { silent = false } = {}) {
    const states = this.getStates();
    if (!states.includes(value)) {
      value = states[0] || this.getDefault();
    }
    this.value = value;
    if (this.hiddenInput) this.hiddenInput.value = value;
    this._renderTrigger();
    if (!silent) this.onChange(value);
  }

  getValue() {
    return this.value;
  }

  refresh() {
    this._renderTrigger();
    if (this.open) this._renderOptions();
  }

  _renderTrigger() {
    const icon = getStateIcon(this.value);
    const label = tState(this.value);
    if (this.triggerIcon) this.triggerIcon.textContent = icon;
    if (this.triggerText) this.triggerText.textContent = label;
  }

  _renderOptions() {
    const states = this.getStates();
    const current = this.value;

    this.dropdown.innerHTML = states.map(id => {
      const icon = getStateIcon(id);
      const label = tState(id);
      const isSelected = id === current;
      return `
        <button type="button"
                class="combo-option ${isSelected ? 'selected' : ''}"
                data-value="${escapeHtml(id)}"
                role="option"
                aria-selected="${isSelected ? 'true' : 'false'}">
          <span class="combo-option-icon">${icon}</span>
          <span class="combo-option-text">${escapeHtml(label)}</span>
        </button>
      `;
    }).join('');
  }
}