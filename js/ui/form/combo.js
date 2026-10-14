// ============================================================
// RoleCombo: filterable role dropdown.
// ============================================================

import { DEFAULT_ROLES, ROLE_TAGS, NO_ROLE_VALUE } from '../../app/constants.js';
import { escapeHtml } from '../../app/utils.js';
import { icon } from '../../app/icons.js';
import { t } from '../../i18n/index.js';

const DEVELOPER_ROLE = /\b(developer|engineer|sre|tech lead|software|front[\s-]?end|back[\s-]?end|full[\s-]?stack)\b/i;

// ------------------------------------------------------------
// Icon lookup
// ------------------------------------------------------------
// Category id → sprite id (matches ROLE_TAGS_LIST in constants.js)
const TAG_ICON = {
  programmer: 'icon-monitor',
  frontend:   'icon-palette',
  backend:    'icon-settings',
  fullstack:  'icon-package',
  mobile:     'icon-keyboard',
  qa:         'icon-flask',
  devops:     'icon-refresh-cw',
  data:       'icon-bar-chart',
  security:   'icon-lock',
  leadership: 'icon-trophy',
  gamedev:    'icon-flame',
};

/**
 * Derives the sprite id for a role. Checks (in order):
 *   1. Custom tags stored in config.roles.customTags[role]
 *   2. Built-in ROLE_TAGS[role]
 *   3. A keyword heuristic on the role name
 *   4. Fallback: briefcase
 */
function getRoleIcon(role, config) {
  if (role === NO_ROLE_VALUE) return 'icon-sparkle';

  const customTags = config?.roles?.customTags?.[role] || [];
  const builtinTags = ROLE_TAGS[role] || [];
  const tags = [...builtinTags, ...customTags];

  for (const tag of tags) {
    if (TAG_ICON[tag]) return TAG_ICON[tag];
  }

  const lower = role.toLowerCase();
  if (/front|ui|ux/.test(lower)) return 'icon-palette';
  if (/full[\s-]?stack/.test(lower)) return 'icon-package';
  if (/mobile|ios|android/.test(lower)) return 'icon-keyboard';
  if (/back[\s-]?end|server|api/.test(lower)) return 'icon-settings';
  if (/qa|test/.test(lower)) return 'icon-flask';
  if (/devops|sre|cloud|platform/.test(lower)) return 'icon-refresh-cw';
  if (/data|machine|ml|ai|analytics/.test(lower)) return 'icon-bar-chart';
  if (/security|infosec/.test(lower)) return 'icon-lock';
  if (/lead|manager|cto|director|head/.test(lower)) return 'icon-trophy';
  if (/game/.test(lower)) return 'icon-flame';

  return 'icon-briefcase';
}

/**
 * Builds the list of roles according to the user config.
 * Custom roles may carry their own tags in config.roles.customTags.
 */
export function getAvailableRoles(config) {
  if (!config || !config.roles) return [...DEFAULT_ROLES];

  const { activeTags = [], hidden = [], custom = [], customTags = {} } = config.roles;
  const activeSet = new Set(activeTags);
  const hiddenSet = new Set(hidden);

  function tagsFor(role) {
    return ROLE_TAGS[role] || customTags[role] || [];
  }

  const filteredDefaults = DEFAULT_ROLES.filter(p => {
    if (hiddenSet.has(p)) return false;
    if (p === NO_ROLE_VALUE) return true;
    if (activeSet.size === 0) return true;
    return tagsFor(p).some(t => activeSet.has(t));
  });

  const filteredCustoms = custom.filter(p => {
    if (hiddenSet.has(p)) return false;
    const tags = tagsFor(p);
    if (tags.length === 0) return true;
    if (activeSet.size === 0) return true;
    return tags.some(t => activeSet.has(t));
  });

  return [...filteredCustoms, ...filteredDefaults];
}

function getOptions(jobRoles, query, config) {
  const available = getAvailableRoles(config);

  const used = [...new Set(jobRoles.filter(p => p && DEVELOPER_ROLE.test(p)))];
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
    const noRole = available.filter(p => p === NO_ROLE_VALUE);
    const rest = available.filter(p => p !== NO_ROLE_VALUE);
    filtered = [...noRole, ...recent, ...rest];
  }

  return filtered.slice(0, 40);
}

export class RoleCombo {
  /**
   * @param {HTMLElement} comboEl
   * @param {{
   *   getJobRoles?: () => string[],
   *   getConfig?: () => object,
   *   onSelect?: (value: string) => void,
   *   onCreateRequested?: (suggestedName: string) => Promise<string | null>,
   * }} opts
   */
  constructor(comboEl, opts = {}) {
    this.combo = comboEl;
    this.input = comboEl.querySelector('input');
    this.dropdown = comboEl.querySelector('.combo-dropdown');
    this.getJobRoles = opts.getJobRoles || (() => []);
    this.getConfig = opts.getConfig || (() => null);
    this.onSelect = opts.onSelect || (() => {});
    this.onCreateRequested = typeof opts.onCreateRequested === 'function'
      ? opts.onCreateRequested
      : null;

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

    this.dropdown.addEventListener('mousedown', (e) => {
      if (e.target.closest('.combo-create-option')) return;
      e.preventDefault();
    });

    this.dropdown.addEventListener('click', (e) => this._onDropdownClick(e));
  }

  async _onDropdownClick(e) {
    const createBtn = e.target.closest('.combo-create-option');
    if (createBtn && this.onCreateRequested) {
      e.preventDefault();
      e.stopPropagation();

      const suggested = this.input.value.trim();
      this.hide();

      let newName = null;
      try {
        newName = await this.onCreateRequested(suggested);
      } catch (err) {
        console.error('[RoleCombo] create failed', err);
      }

      if (newName) {
        this.selectValue(newName);
        setTimeout(() => this.input.focus(), 0);
      } else {
        this.input.focus();
      }
      return;
    }

    const opt = e.target.closest('.combo-option');
    if (!opt) return;
    this.selectValue(opt.dataset.value);
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
    const roles = getOptions(this.getJobRoles(), query, config);

    let html = '';

    if (roles.length === 0) {
      html += `
        <div class="combo-empty">
          No matches.
        </div>
      `;
    } else {
      const used = new Set(this.getJobRoles());
      const available = new Set(getAvailableRoles(config));

      roles.forEach((p, idx) => {
        const isNoRole = p === NO_ROLE_VALUE;
        const isRecent = !isNoRole && used.has(p) && !available.has(p);
        const iconName = getRoleIcon(p, config);
        const isSelected = this.input.value === p;
        const isHighlighted = idx === this.highlightedIdx;

        let tag = '';
        if (isNoRole) tag = 'Generic';
        else if (isRecent) tag = 'Recent';

        if (isRecent && idx === 0) {
          html += `<div class="combo-section-label">Recently used</div>`;
        } else if (
          !isRecent && !isNoRole && idx > 0 &&
          used.has(roles[idx - 1]) && !available.has(roles[idx - 1])
        ) {
          html += `<div class="combo-section-label">Suggested</div>`;
        }

        html += `
          <button type="button"
                  class="combo-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''} ${isRecent ? 'recent' : ''} ${isNoRole ? 'generic' : ''}"
                  data-value="${escapeHtml(p)}"
                  data-idx="${idx}">
            <span class="combo-option-icon">${icon(iconName)}</span>
            <span class="combo-option-text">${escapeHtml(p)}</span>
            ${tag ? `<span class="combo-option-tag">${tag}</span>` : ''}
          </button>
        `;
      });
    }

    if (this.onCreateRequested) {
      const hasExactMatch = roles.some(
        r => r.toLowerCase() === query.toLowerCase()
      );
      const showNamed = query && !hasExactMatch;
      const label = showNamed
        ? t('combo.createNamed', { name: query })
        : t('combo.create');

      html += `
        <button type="button" class="combo-create-option" data-create>
          <span class="combo-create-icon">+</span>
          <span>${escapeHtml(label)}</span>
        </button>
      `;
    }

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
      // Prevent a parent modal from also reacting to the same
      // Escape (its own stack-based handler listens on `document`).
      e.stopPropagation();
    }
  }

  _updateHighlight(options) {
    options.forEach((o, i) => o.classList.toggle('highlighted', i === this.highlightedIdx));
    if (options[this.highlightedIdx]) {
      options[this.highlightedIdx].scrollIntoView({ block: 'nearest' });
    }
  }
}