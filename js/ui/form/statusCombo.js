// ============================================================
// StatusCombo: custom dropdown to pick the initial status.
// Same visual language as RoleCombo: icons, hover, selected,
// highlighted, chevron rotation.
//
// Internally keeps a hidden input so the rest of the form can
// read the value exactly like before.
// ============================================================

import { WORKFLOW_STEPS, getStateIcon } from '../../app/constants.js';
import { escapeHtml } from '../../app/utils.js';
import { icon } from '../../app/icons.js';
import { tState } from '../../i18n/index.js';

export class StatusCombo {
  /**
   * @param {HTMLElement} comboEl  root .combo
   * @param {{
   *   getStatuses?: () => string[],
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

    this.getStatuses = opts.getStatuses || (() => WORKFLOW_STEPS.map(s => s.id));
    this.getDefault = opts.getDefault || (() => 'Applied');
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
        // Prevent a parent modal from also reacting to the same
        // Escape (its own stack-based handler listens on `document`).
        e.stopPropagation();
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
    const statuses = this.getStatuses();
    if (!statuses.includes(value)) {
      value = statuses[0] || this.getDefault();
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
    const iconName = getStateIcon(this.value);
    const label = tState(this.value);
    if (this.triggerIcon) this.triggerIcon.innerHTML = icon(iconName);
    if (this.triggerText) this.triggerText.textContent = label;
  }

  _renderOptions() {
    const statuses = this.getStatuses();
    const current = this.value;

    this.dropdown.innerHTML = statuses.map(id => {
      const iconName = getStateIcon(id);
      const label = tState(id);
      const isSelected = id === current;
      return `
        <button type="button"
                class="combo-option ${isSelected ? 'selected' : ''}"
                data-value="${escapeHtml(id)}"
                role="option"
                aria-selected="${isSelected ? 'true' : 'false'}">
          <span class="combo-option-icon">${icon(iconName)}</span>
          <span class="combo-option-text">${escapeHtml(label)}</span>
        </button>
      `;
    }).join('');
  }
}