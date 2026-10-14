// ============================================================
// Controller: create a role from the picker combo.
// Modal with name + categories (multi-select).
// Persists the role in config.roles.custom and its tags in
// config.roles.customTags.
// ============================================================

import { showToast } from '../ui/feedback/toast.js';
import { DEFAULT_ROLES, ROLE_TAGS_LIST } from '../app/constants.js';
import { escapeHtml } from '../app/utils.js';
import { icon } from '../app/icons.js';
import { t } from '../i18n/index.js';

/**
 * @param {import('../app/store.js').Store} configStore
 */
export function mountCreateRoleController(configStore) {
  const modal = document.getElementById('createRoleModal');
  const input = document.getElementById('createRoleName');
  const saveBtn = document.getElementById('saveCreateRole');
  const cancelBtn = document.getElementById('cancelCreateRole');
  const catsWrap = document.getElementById('createRoleCats');

  if (!modal || !input) {
    return {
      open: () => Promise.resolve(null),
      requestNewRole: () => Promise.resolve(null),
    };
  }

  let pendingResolve = null;
  let selectedCats = new Set();

  // ----------------------------------------------------------
  // Category chip rendering
  // ----------------------------------------------------------
  function renderCats() {
    if (!catsWrap) return;
    catsWrap.innerHTML = ROLE_TAGS_LIST.map(cat => {
      const isSelected = selectedCats.has(cat.id);
      return `
        <button type="button"
                class="create-cat-chip ${isSelected ? 'selected' : ''}"
                data-cat="${escapeHtml(cat.id)}">
          ${icon(cat.icon)}
          <span>${escapeHtml(cat.label)}</span>
        </button>
      `;
    }).join('');
  }

  if (catsWrap) {
    catsWrap.addEventListener('click', (e) => {
      const chip = e.target.closest('.create-cat-chip');
      if (!chip) return;
      const id = chip.dataset.cat;
      if (selectedCats.has(id)) selectedCats.delete(id);
      else selectedCats.add(id);
      renderCats();
    });
  }

  // ----------------------------------------------------------
  // Open / close
  // ----------------------------------------------------------
  function isOpen() {
    return modal.classList.contains('open');
  }

  function open({ suggested = '', preSelectedCats = [] } = {}) {
    return new Promise((resolve) => {
      pendingResolve = resolve;
      input.value = suggested;
      saveBtn.disabled = !suggested.trim();
      selectedCats = new Set(preSelectedCats);
      renderCats();
      modal.classList.add('open');
      setTimeout(() => {
        input.focus();
        input.select();
      }, 80);
    });
  }

  function close(result = null) {
    modal.classList.remove('open');
    if (pendingResolve) {
      pendingResolve(result);
      pendingResolve = null;
    }
  }

  function commit() {
    const name = input.value.trim();
    if (!name) return;
    close({ name, cats: [...selectedCats] });
  }

  input.addEventListener('input', () => {
    saveBtn.disabled = !input.value.trim();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      close(null);
    }
  });

  saveBtn.addEventListener('click', commit);
  cancelBtn.addEventListener('click', () => close(null));

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close(null);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (isOpen()) {
      e.stopPropagation();
      close(null);
    }
  }, true);

  // ----------------------------------------------------------
  // requestNewRole
  // ----------------------------------------------------------
  async function requestNewRole(suggested = '') {
    const cfg = configStore.get();
    const custom = cfg.roles?.custom || [];
    const customTags = cfg.roles?.customTags || {};
    const preSelectedCats = customTags[suggested] || [];

    const result = await open({ suggested, preSelectedCats });
    if (!result) return null;

    const { name, cats } = result;

    const hidden = cfg.roles?.hidden || [];
    const isDefault = DEFAULT_ROLES.includes(name);
    const isCustom = custom.includes(name);

    configStore.update(c => {
      const nextRoles = { ...(c.roles || {}) };
      const nextCustom = [...(nextRoles.custom || [])];
      const nextCustomTags = { ...(nextRoles.customTags || {}) };
      const nextHidden = [...(nextRoles.hidden || [])];

      if (!isDefault && !isCustom) {
        nextCustom.push(name);
      }

      if (cats.length > 0) {
        nextCustomTags[name] = cats;
      } else {
        delete nextCustomTags[name];
      }

      const hiddenIdx = nextHidden.indexOf(name);
      if (hiddenIdx >= 0) nextHidden.splice(hiddenIdx, 1);

      nextRoles.custom = nextCustom;
      nextRoles.customTags = nextCustomTags;
      nextRoles.hidden = nextHidden;

      return { ...c, roles: nextRoles };
    });

    if (!isDefault && !isCustom) {
      showToast(t('toast.roleCreated', { name }), 'icon-sparkle');
    }

    return name;
  }

  return { open, requestNewRole };
}