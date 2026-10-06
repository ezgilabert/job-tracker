// ============================================================
// PuestoCombo: filterable role dropdown
// ============================================================

import { DEFAULT_PUESTOS, PUESTO_TAGS, PUESTO_ICONS } from '../constants.js';
import { escapeHtml } from '../utils.js';

const DEVELOPER_ROLE = /\b(developer|engineer|sre|tech lead|software|front[\s-]?end|back[\s-]?end|full[\s-]?stack)\b/i;

function getPuestoIcon(puesto) {
  for (const key in PUESTO_ICONS) {
    if (puesto.toLowerCase().includes(key.toLowerCase())) return PUESTO_ICONS[key];
  }
  return '💼';
}

/**
 * Builds the list of roles according to user config.
 */
export function getAvailablePuestos(config) {
  if (!config || !config.puestos) return [...DEFAULT_PUESTOS];

  const { activeTags = [], hidden = [], custom = [] } = config.puestos;
  const activeSet = new Set(activeTags);
  const hiddenSet = new Set(hidden);

  const defaultsFiltrados = DEFAULT_PUESTOS.filter(p => {
    if (hiddenSet.has(p)) return false;
    if (activeSet.size === 0) return true;
    const tags = PUESTO_TAGS[p] || [];
    return tags.some(t => activeSet.has(t));
  });

  const customsFiltrados = custom.filter(p => !hiddenSet.has(p));

  return [...customsFiltrados, ...defaultsFiltrados];
}

function getOptions(jobsPuestos, query, config) {
  const disponibles = getAvailablePuestos(config);

  const usados = [...new Set(jobsPuestos.filter(p => p && DEVELOPER_ROLE.test(p)))];
  const full = [...new Set([...usados, ...disponibles])];

  const q = query.toLowerCase().trim();
  let filtrados;

  if (q) {
    filtrados = full.filter(p => p.toLowerCase().includes(q));
    filtrados.sort((a, b) => {
      const aLow = a.toLowerCase();
      const bLow = b.toLowerCase();
      const aStart = aLow.startsWith(q);
      const bStart = bLow.startsWith(q);
      if (aStart && !bStart) return -1;
      if (!aStart && bStart) return 1;
      return a.localeCompare(b);
    });
  } else {
    const recientes = usados.filter(p => !disponibles.includes(p));
    filtrados = [...recientes, ...disponibles];
  }

  return filtrados.slice(0, 40);
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
    const puestos = getOptions(this.getJobPuestos(), query, config);

    if (puestos.length === 0) {
      this.dropdown.innerHTML = `
        <div class="combo-empty">
          No hay coincidencias.<br>
          <strong>Enter</strong> para usar "${escapeHtml(query)}"
        </div>
      `;
      return;
    }

    const usados = new Set(this.getJobPuestos());
    const disponibles = new Set(getAvailablePuestos(config));
    let html = '';

    puestos.forEach((p, idx) => {
      const isReciente = usados.has(p) && !disponibles.has(p);
      const icon = getPuestoIcon(p);
      const isSelected = this.input.value === p;
      const isHighlighted = idx === this.highlightedIdx;
      const tag = isReciente ? 'Reciente' : '';

      if (isReciente && idx === 0) {
        html += `<div class="combo-section-label">Usados recientemente</div>`;
      } else if (
        !isReciente && idx > 0 &&
        usados.has(puestos[idx - 1]) && !disponibles.has(puestos[idx - 1])
      ) {
        html += `<div class="combo-section-label">Sugeridos</div>`;
      }

      html += `
        <button type="button"
                class="combo-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''} ${isReciente ? 'recent' : ''}"
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