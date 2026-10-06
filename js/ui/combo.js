// ============================================================
// PuestoCombo: filterable role dropdown
// ============================================================

import { DEFAULT_ROLES, ROLE_TAGS, ROLE_ICONS } from '../constants.js';
import { escapeHtml } from '../utils.js';

const DEVELOPER_ROLE = /\b(developer|engineer|sre|tech lead|software|front[\s-]?end|back[\s-]?end|full[\s-]?stack)\b/i;

function getRoleIcon(role) {
  for (const key in ROLE_ICONS) {
    if (role.toLowerCase().includes(key.toLowerCase())) return ROLE_ICONS[key];
  }
  return '💼';
}

/**
 * Builds the list of roles according to user config.
 */
export function getAvailableRoles(config) {
  if (!config || !config.puestos) return [...DEFAULT_ROLES];

  const { activeTags = [], hidden = [], custom = [] } = config.puestos;
  const activeSet = new Set(activeTags);
  const hiddenSet = new Set(hidden);

  const filteredDefaults = DEFAULT_ROLES.filter(p => {
    if (hiddenSet.has(p)) return false;
    if (activeSet.size === 0) return true;
    const tags = ROLE_TAGS[p] || [];
    return tags.some(t => activeSet.has(t));
  });

  const filteredCustoms = custom.filter(p => !hiddenSet.has(p));

  return [...filteredCustoms, ...filteredDefaults];
}

function getOptions(jobsRoles, query, config) {
  const available = getAvailableRoles(config);

  const used = [...new Set(jobsRoles.filter(p => p && DEVELOPER_ROLE.test(p)))];
  const full = [...new Set([...used, ...available])];

  const q = query.toLowerCase().trim();
  let filtered;

  if (q) {
    filtered = full.filter(p => p.toLowerCase().includes(q));
    filtered.sort((a, b) => {
      const aLow = a.toLowerCase();
      const bLow = b.toLowerCase();
      const aStart = aLow.startsWith(q);
      const bStart = bLow.startsWith(q);
      if (aStart && !bStart) return -1;
      if (!aStart && bStart) return 1;
      return a.localeCompare(b);
    });
  } else {
    const recent = used.filter(p => !available.includes(p));
    filtered = [...recent, ...available];
  }

  return filtered.slice(0, 40);
}

export class PuestoCombo {
  /**
   * @param {HTMLElement} comboEl
   * @param {{
   *   getJobPuestos?: () => string[],
   *   getConfig?: () => object,
   *   onSelect?: (value:string) => void,
   * }} opts
   */
  constructor(comboEl, opts = {}) {
    this.combo = comboEl;
    this.input = comboEl.querySelector('input');
    this.dropdown = comboEl.querySelector('.combo-dropdown');
    this.getJobPuestos = opts.getJobPuestos || (() => []);
    this.getConfig = opts.getConfig || (() => null);
    this.onSelect = opts.onSelect || (() => {});

    this.open = false;
    this.highlightedIdx = -1;

    this._init();
  }

  _init() {
    this.input.addEventListener('focus', () => this.show());
    this.input.addEventListener('input', () => {
      this.highlightedIdx = -1;
      this.renderOptions();
      this.show();
    });
    this.input.addEventListener('keydown', (e) => this._handleKey(e));

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
  }

  destroy() {
    document.removeEventListener('click', this._outsideClick);
  }

  show() {
    if (this.open) return;
    this.open = true;
    this.combo.classList.add('open');
    this.renderOptions();
  }

  hide() {
    this.open = false;
    this.combo.classList.remove('open');
    this.highlightedIdx = -1;
  }

  selectValue(value) {
    this.input.value = value;
    this.hide();
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
    this.onSelect(value);
  }

  renderOptions() {
    const query = this.input.value.trim();
    const config = this.getConfig();
    const roles = getOptions(this.getJobPuestos(), query, config);

    if (roles.length === 0) {
      this.dropdown.innerHTML = `
        <div class="combo-empty">
          No hay coincidencias.<br>
          <strong>Enter</strong> para usar "${escapeHtml(query)}"
        </div>
      `;
      return;
    }

    const used = new Set(this.getJobPuestos());
    const available = new Set(getAvailableRoles(config));
    let html = '';

    roles.forEach((p, idx) => {
      const isRecent = used.has(p) && !available.has(p);
      const icon = getRoleIcon(p);
      const isSelected = this.input.value === p;
      const isHighlighted = idx === this.highlightedIdx;
      const tag = isRecent ? 'Reciente' : '';

      if (isRecent && idx === 0) {
        html += `<div class="combo-section-label">Usados recientemente</div>`;
      } else if (
        !isRecent && idx > 0 &&
        used.has(roles[idx - 1]) && !available.has(roles[idx - 1])
      ) {
        html += `<div class="combo-section-label">Sugeridos</div>`;
      }

      html += `
        <button type="button"
                class="combo-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''} ${isRecent ? 'recent' : ''}"
                data-value="${escapeHtml(p)}"
                data-idx="${idx}">
          <span class="combo-option-icon">${icon}</span>
          <span class="combo-option-text">${escapeHtml(p)}</span>
          ${tag ? `<span class="combo-option-tag">${tag}</span>` : ''}
        </button>
      `;
    });

    this.dropdown.innerHTML = html;
  }

  _handleKey(e) {
    const options = [...this.dropdown.querySelectorAll('.combo-option')];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this.open) { this.show(); return; }
      this.highlightedIdx = Math.min(this.highlightedIdx + 1, options.length - 1);
      this._updateHighlight(options);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.highlightedIdx = Math.max(this.highlightedIdx - 1, 0);
      this._updateHighlight(options);
    } else if (e.key === 'Enter') {
      if (this.open && this.highlightedIdx >= 0 && options[this.highlightedIdx]) {
        e.preventDefault();
        this.selectValue(options[this.highlightedIdx].dataset.value);
      } else {
        this.hide();
      }
    } else if (e.key === 'Escape') {
      this.hide();
      this.input.blur();
    }
  }

  _updateHighlight(options) {
    options.forEach((o, i) => o.classList.toggle('highlighted', i === this.highlightedIdx));
    if (options[this.highlightedIdx]) {
      options[this.highlightedIdx].scrollIntoView({ block: 'nearest' });
    }
  }
}