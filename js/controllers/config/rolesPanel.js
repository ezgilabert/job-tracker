// ============================================================
// Config panel: Roles
//
// Three sections:
//   - Categories (checkbox chips): toggle a category on/off.
//   - Add custom role: text input + Add button.
//   - Available roles: list with remove.
//   - Hidden roles: list with restore.
// ============================================================

import {
  ROLE_TAGS_LIST, ROLE_TAGS, DEFAULT_ROLES, NO_ROLE_VALUE,
} from '../../app/constants.js';
import { escapeHtml } from '../../app/utils.js';
import { icon } from '../../app/icons.js';
import { t } from '../../i18n/index.js';

export function mountRolesPanel(host) {
  const tagsEl = document.getElementById('configTags');
  const listEl = document.getElementById('configRolesList');
  const countEl = document.getElementById('configRolesCount');
  const hiddenSection = document.getElementById('configHiddenSection');
  const hiddenListEl = document.getElementById('configHiddenList');
  const newRoleInput = document.getElementById('configNewRole');
  const addRoleBtn = document.getElementById('configAddRole');

  // ----------------------------------------------------------
  // Categories
  // ----------------------------------------------------------
  function renderTags() {
    const draft = host.getDraft();
    if (!draft) return;
    const active = new Set(draft.roles.activeTags || []);

    tagsEl.innerHTML = ROLE_TAGS_LIST.map(tag => {
      const isSelected = active.has(tag.id);
      return `
        <button type="button"
                class="config-tag ${isSelected ? 'selected' : ''}"
                data-tag="${escapeHtml(tag.id)}">
          ${icon(tag.icon)}
          <span>${escapeHtml(tag.label)}</span>
        </button>
      `;
    }).join('');
  }

  tagsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.config-tag');
    if (!btn) return;
    const draft = host.getDraft();
    if (!draft) return;

    const tag = btn.dataset.tag;
    const active = new Set(draft.roles.activeTags || []);
    if (active.has(tag)) active.delete(tag);
    else active.add(tag);
    draft.roles.activeTags = [...active];
    host.renderAll();
  });

  // ----------------------------------------------------------
  // Available roles list
  // ----------------------------------------------------------
  function getVisibleRoles() {
    const draft = host.getDraft();
    if (!draft) return [];

    const active = new Set(draft.roles.activeTags || []);
    const hidden = new Set(draft.roles.hidden || []);
    const custom = draft.roles.custom || [];
    const customTags = draft.roles.customTags || {};

    function tagsFor(role) {
      return ROLE_TAGS[role] || customTags[role] || [];
    }

    const customs = custom.filter(p => {
      if (hidden.has(p)) return false;
      const tags = tagsFor(p);
      if (tags.length === 0) return true;
      if (active.size === 0) return true;
      return tags.some(tg => active.has(tg));
    });

    const defaults = DEFAULT_ROLES.filter(p => {
      if (hidden.has(p)) return false;
      if (p === NO_ROLE_VALUE) return true;
      if (active.size === 0) return true;
      const tags = ROLE_TAGS[p] || [];
      return tags.some(tg => active.has(tg));
    });

    return [...customs, ...defaults];
  }

  function renderRolesList() {
    const draft = host.getDraft();
    if (!draft) return;

    const list = getVisibleRoles();
    countEl.textContent = list.length;

    if (list.length === 0) {
      listEl.innerHTML = `<div class="config-empty">${escapeHtml(t('config.noRoles'))}</div>`;
      return;
    }

    listEl.innerHTML = list.map(p => {
      const isCustom = (draft.roles.custom || []).includes(p);
      return `
        <div class="config-role-item">
          <span>${escapeHtml(p)}</span>
          <button type="button"
                  class="remove"
                  data-role="${escapeHtml(p)}"
                  data-custom="${isCustom}"
                  title="${isCustom ? t('config.removeCustom') : t('config.hide')}">×</button>
        </div>
      `;
    }).join('');
  }

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove');
    if (!btn) return;
    const draft = host.getDraft();
    if (!draft) return;

    const role = btn.dataset.role;
    const isCustom = btn.dataset.custom === 'true';

    if (isCustom) {
      draft.roles.custom = (draft.roles.custom || []).filter(p => p !== role);
      if (draft.roles.customTags) {
        delete draft.roles.customTags[role];
      }
    } else {
      const hidden = new Set(draft.roles.hidden || []);
      hidden.add(role);
      draft.roles.hidden = [...hidden];
    }
    host.renderAll();
  });

  // ----------------------------------------------------------
  // Hidden roles list
  // ----------------------------------------------------------
  function renderHiddenList() {
    const draft = host.getDraft();
    if (!draft) return;

    const hidden = draft.roles.hidden || [];

    if (hidden.length === 0) {
      hiddenSection.classList.add('is-hidden');
      return;
    }
    hiddenSection.classList.remove('is-hidden');

    hiddenListEl.innerHTML = hidden.map(p => `
      <div class="config-role-item hidden-role">
        <span>${escapeHtml(p)}</span>
        <button type="button" class="restore" data-role="${escapeHtml(p)}" title="${t('config.restore')}">+</button>
      </div>
    `).join('');
  }

  hiddenListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.restore');
    if (!btn) return;
    const draft = host.getDraft();
    if (!draft) return;

    const role = btn.dataset.role;
    draft.roles.hidden = (draft.roles.hidden || []).filter(p => p !== role);
    host.renderAll();
  });

  // ----------------------------------------------------------
  // Add custom role
  // ----------------------------------------------------------
  function addCustomRole() {
    const draft = host.getDraft();
    if (!draft) return;

    const value = newRoleInput.value.trim();
    if (!value) return;

    const alreadyExists =
      (draft.roles.custom || []).includes(value) || DEFAULT_ROLES.includes(value);

    if (alreadyExists) {
      host.showToast(t('toast.roleExists'), 'icon-alert-triangle');
      return;
    }

    draft.roles.custom = [...(draft.roles.custom || []), value];
    draft.roles.hidden = (draft.roles.hidden || []).filter(p => p !== value);
    newRoleInput.value = '';
    host.renderAll();
    host.showToast(t('toast.roleAdded'), 'icon-check');
  }

  addRoleBtn.addEventListener('click', addCustomRole);
  newRoleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCustomRole(); }
  });

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  function render() {
    renderTags();
    renderRolesList();
    renderHiddenList();
  }

  return { render };
}