// ============================================================
// Controller: config
// Modal with tabs (roles, initial states, filters, appearance,
// profile, language, advanced). Draft in memory. Warns if unsaved.
// ============================================================

import { showToast } from '../ui/toast.js';
import { showConfirm } from '../ui/confirmModal.js';
import {
  ROLE_TAGS_LIST, ROLE_TAGS, DEFAULT_ROLES,
  WORKFLOW_STEPS, CONFIG_FILTER_META, getDefaultConfig,
  LOGO_OPTIONS, DEFAULT_LOGO, DEFAULT_LANG,
  BACKGROUND_OPTIONS, DEFAULT_BACKGROUND, applyBackground,
} from '../constants.js';
import { escapeHtml, cloneArray } from '../utils.js';
import {
  SUPPORTED_LANGS, t, tState, tStateShort,
} from '../i18n.js';

/**
 * @param {import('../store.js').Store} configStore
 */
export function mountConfigController(configStore) {
  const modal = document.getElementById('configModal');
  const unsavedModal = document.getElementById('unsavedModal');
  const unsavedBadge = document.getElementById('configUnsavedBadge');

  const tabs = [...modal.querySelectorAll('.config-tab')];
  const panels = [...modal.querySelectorAll('.config-panel')];

  // ----------------------------------------------------------
  // Draft state
  // ----------------------------------------------------------
  let draft = null;

  // Remember the user's explicit choice for the default state,
  // even if it temporarily falls outside the active states set
  // (uncheck → recheck should restore it).
  let preferredDefaultState = null;

  function cloneConfig(cfg) {
    return JSON.parse(JSON.stringify(cfg));
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
      if (keysA[i] !== keysB[i]) return false;
      if (!deepEqual(a[keysA[i]], b[keysA[i]])) return false;
    }
    return true;
  }

  // ----------------------------------------------------------
  // Dirty check
  // ----------------------------------------------------------
  // Tag/role/state arrays behave like sets: toggle-off + toggle-on
  // changes insertion order but the selection is the same. We
  // normalize (sort) before comparing to avoid false positives.
  // Filters ARE order-sensitive (reordered on purpose), so they
  // aren't normalized.
  function normalizeForDirtyCheck(cfg) {
    const copy = cloneConfig(cfg || {});
    if (copy.puestos) {
      if (Array.isArray(copy.puestos.activeTags)) {
        copy.puestos.activeTags = [...copy.puestos.activeTags].sort();
      }
      if (Array.isArray(copy.puestos.hidden)) {
        copy.puestos.hidden = [...copy.puestos.hidden].sort();
      }
      if (Array.isArray(copy.puestos.custom)) {
        copy.puestos.custom = [...copy.puestos.custom].sort();
      }
    }
    if (Array.isArray(copy.estadosIniciales)) {
      copy.estadosIniciales = [...copy.estadosIniciales].sort();
    }
    return copy;
  }

  function isDraftDirty() {
    if (!draft) return false;
    return !deepEqual(
      normalizeForDirtyCheck(draft),
      normalizeForDirtyCheck(configStore.get()),
    );
  }

  function updateBadge() {
    unsavedBadge.classList.toggle('visible', isDraftDirty());
  }

  // ----------------------------------------------------------
  // Brand logo helper (to revert preview when discarding)
  // ----------------------------------------------------------
  // Mirrors the inline logic from main.js/login.js. Used in
  // closeDirect() to restore the saved logo when discarding
  // changes.
  function applyLogoToBrand(logoId) {
    const el = document.getElementById('brandLogo');
    if (!el) return;
    const option = LOGO_OPTIONS.find(o => o.id === logoId) || LOGO_OPTIONS[0];
    el.innerHTML = option.svg;
  }

  // ----------------------------------------------------------
  // Open / close
  // ----------------------------------------------------------
  function open() {
    const stored = configStore.get();
    const defaults = getDefaultConfig();

    draft = cloneConfig({
      ...defaults,
      ...stored,
      profile: { ...defaults.profile, ...(stored.profile || {}) },
    });

    if (!draft.lang) draft.lang = DEFAULT_LANG;
    if (!draft.background) draft.background = DEFAULT_BACKGROUND;

    // Initialize the default preference from the saved value.
    preferredDefaultState = draft.estadoInicialDefault || null;

    modal.classList.add('open');
    renderAll();
  }

  function closeDirect() {
    // If an unsaved preview is left, revert to the saved state.
    const saved = configStore.get();
    applyBackground(saved.background || DEFAULT_BACKGROUND);
    applyLogoToBrand(saved.logo || DEFAULT_LOGO);

    draft = null;
    preferredDefaultState = null;
    modal.classList.remove('open');
    unsavedBadge.classList.remove('visible');
  }

  function saveDraft() {
    const defaults = getDefaultConfig();
    const next = cloneConfig({
      ...defaults,
      ...draft,
      profile: { ...defaults.profile, ...(draft.profile || {}) },
    });
    if (!next.logo) next.logo = DEFAULT_LOGO;
    if (!next.lang) next.lang = DEFAULT_LANG;
    if (!next.background) next.background = DEFAULT_BACKGROUND;
    configStore.update(() => next);
    draft = cloneConfig(configStore.get());
    unsavedBadge.classList.remove('visible');
  }

  function tryClose() {
    if (isDraftDirty()) {
      unsavedModal.classList.add('open');
    } else {
      closeDirect();
    }
  }

  document.getElementById('configBtn').addEventListener('click', open);
  document.getElementById('closeConfigBtn').addEventListener('click', tryClose);
  document.getElementById('cancelConfigBtn').addEventListener('click', tryClose);
  document.getElementById('saveConfigBtn').addEventListener('click', () => {
    if (!isDraftDirty()) {
      closeDirect();
      return;
    }
    saveDraft();
    closeDirect();
    showToast(t('toast.savedConfig'), '✓');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) tryClose();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (unsavedModal.classList.contains('open')) {
      unsavedModal.classList.remove('open');
      return;
    }
    if (modal.classList.contains('open')) tryClose();
  });

  // Unsaved changes modal
  document.getElementById('unsavedCloseBtn').addEventListener('click', () => {
    unsavedModal.classList.remove('open');
  });
  document.getElementById('unsavedDiscard').addEventListener('click', () => {
    unsavedModal.classList.remove('open');
    closeDirect();
    showToast(t('toast.discardedChanges'), '↺');
  });
  document.getElementById('unsavedSave').addEventListener('click', () => {
    unsavedModal.classList.remove('open');
    saveDraft();
    closeDirect();
    showToast(t('toast.savedConfig'), '✓');
  });
  unsavedModal.addEventListener('click', (e) => {
    if (e.target === unsavedModal) unsavedModal.classList.remove('open');
  });

  // Reset (lives in the "Advanced" panel → Danger zone)
  document.getElementById('resetConfigBtn').addEventListener('click', async () => {
    const ok = await showConfirm({
      title: t('confirm.resetConfig.title'),
      message: t('confirm.resetConfig.message'),
      confirmText: t('confirm.resetConfig.confirm'),
      danger: true,
    });
    if (!ok) return;
    draft = getDefaultConfig();
    preferredDefaultState = draft.estadoInicialDefault || null;
    renderAll();
    showToast(t('toast.resetConfig'), '↺');
  });

  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      panels.forEach(p => p.classList.toggle('active', p.dataset.panel === target));
    });
  });

  // ============================================================
  // Render
  // ============================================================
  function renderAll() {
    if (!draft) return;
    renderTags();
    renderRolesList();
    renderHiddenList();
    renderStateCheckboxes();
    renderDefaultState();
    renderFilters();
    renderLogos();
    renderBackgrounds();
    renderLangs();
    renderPerfil();
    updateBadge();
  }

  // ------------------------------------------------------------
  // Panel: Roles
  // ------------------------------------------------------------
  function renderTags() {
    const active = new Set(draft.puestos.activeTags || []);
    document.getElementById('configTags').innerHTML = ROLE_TAGS_LIST.map(tag => {
      const isSelected = active.has(tag.id);
      return `
        <button type="button"
                class="config-tag ${isSelected ? 'selected' : ''}"
                data-tag="${escapeHtml(tag.id)}">
          <span>${tag.icon}</span> ${escapeHtml(tag.label)}
        </button>
      `;
    }).join('');
  }

  document.getElementById('configTags').addEventListener('click', (e) => {
    const btn = e.target.closest('.config-tag');
    if (!btn) return;
    const tag = btn.dataset.tag;
    const active = new Set(draft.puestos.activeTags || []);
    if (active.has(tag)) active.delete(tag);
    else active.add(tag);
    draft.puestos.activeTags = [...active];
    renderAll();
  });

  function getVisibleRoles() {
    const active = new Set(draft.puestos.activeTags || []);
    const hidden = new Set(draft.puestos.hidden || []);
    const custom = draft.puestos.custom || [];

    const customs = custom.filter(p => !hidden.has(p));

    const defaults = DEFAULT_ROLES.filter(p => {
      if (hidden.has(p)) return false;
      if (active.size === 0) return true;
      const tags = ROLE_TAGS[p] || [];
      return tags.some(tg => active.has(tg));
    });

    return [...customs, ...defaults];
  }

  function renderRolesList() {
    const list = getVisibleRoles();
    const container = document.getElementById('configPuestosList');
    document.getElementById('configPuestosCount').textContent = list.length;

    if (list.length === 0) {
      container.innerHTML = `<div class="config-empty">${escapeHtml(t('config.noPuestos'))}</div>`;
      return;
    }

    container.innerHTML = list.map(p => {
      const isCustom = (draft.puestos.custom || []).includes(p);
      return `
        <div class="config-puesto-item">
          <span>${escapeHtml(p)}</span>
          <button type="button"
                  class="remove"
                  data-puesto="${escapeHtml(p)}"
                  data-custom="${isCustom}"
                  title="${isCustom ? t('config.removeCustom') : t('config.hide')}">×</button>
        </div>
      `;
    }).join('');
  }

  document.getElementById('configPuestosList').addEventListener('click', (e) => {
    const btn = e.target.closest('.remove');
    if (!btn) return;
    const puesto = btn.dataset.puesto;
    const isCustom = btn.dataset.custom === 'true';

    if (isCustom) {
      draft.puestos.custom = (draft.puestos.custom || []).filter(p => p !== puesto);
    } else {
      const hidden = new Set(draft.puestos.hidden || []);
      hidden.add(puesto);
      draft.puestos.hidden = [...hidden];
    }
    renderAll();
  });

  function renderHiddenList() {
    const hidden = draft.puestos.hidden || [];
    const section = document.getElementById('configHiddenSection');
    const container = document.getElementById('configHiddenList');

    if (hidden.length === 0) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';

    container.innerHTML = hidden.map(p => `
      <div class="config-puesto-item hidden-puesto">
        <span>${escapeHtml(p)}</span>
        <button type="button" class="restore" data-puesto="${escapeHtml(p)}" title="${t('config.restore')}">+</button>
      </div>
    `).join('');
  }

  document.getElementById('configHiddenList').addEventListener('click', (e) => {
    const btn = e.target.closest('.restore');
    if (!btn) return;
    const puesto = btn.dataset.puesto;
    draft.puestos.hidden = (draft.puestos.hidden || []).filter(p => p !== puesto);
    renderAll();
  });

  const newRoleInput = document.getElementById('configNewPuesto');

  function addCustomRole() {
    const value = newRoleInput.value.trim();
    if (!value) return;
    const alreadyExists = (draft.puestos.custom || []).includes(value) || DEFAULT_ROLES.includes(value);
    if (alreadyExists) {
      showToast(t('toast.roleExists'), '!');
      return;
    }
    draft.puestos.custom = [...(draft.puestos.custom || []), value];
    draft.puestos.hidden = (draft.puestos.hidden || []).filter(p => p !== value);
    newRoleInput.value = '';
    renderAll();
    showToast(t('toast.roleAdded'), '✓');
  }

  document.getElementById('configAddPuesto').addEventListener('click', addCustomRole);
  newRoleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCustomRole(); }
  });

  // ------------------------------------------------------------
  // Panel: Initial states
  // ------------------------------------------------------------
  function renderStateCheckboxes() {
    const active = new Set(draft.estadosIniciales || []);
    document.getElementById('configEstados').innerHTML = WORKFLOW_STEPS.map(s => {
      const checked = active.has(s.id);
      return `
        <label class="config-check ${checked ? 'checked' : ''}">
          <input type="checkbox" data-estado="${escapeHtml(s.id)}" ${checked ? 'checked' : ''}>
          <span class="icon">${s.icon}</span>
          <span>${escapeHtml(tState(s.id))}</span>
        </label>
      `;
    }).join('');
  }

  document.getElementById('configEstados').addEventListener('change', (e) => {
    const input = e.target.closest('input[type="checkbox"]');
    if (!input) return;
    const estado = input.dataset.estado;
    const stateSet = new Set(draft.estadosIniciales || []);

    if (input.checked) {
      stateSet.add(estado);
      // If the user re-checks the state they had chosen as default
      // (and was lost when unchecked), restore it.
      if (estado === preferredDefaultState) {
        draft.estadoInicialDefault = estado;
      }
    } else {
      stateSet.delete(estado);
    }

    draft.estadosIniciales = [...stateSet];

    // Fallback: if the current default is no longer in the set,
    // pick the first available. The real preference stays in
    // preferredDefaultState for when the user re-enables it.
    if (stateSet.size > 0 && !stateSet.has(draft.estadoInicialDefault)) {
      draft.estadoInicialDefault = [...stateSet][0];
    }

    renderAll();
  });

  function renderDefaultState() {
    const active = draft.estadosIniciales || [];
    const container = document.getElementById('configDefaultEstado');

    if (active.length === 0) {
      container.innerHTML = `<div class="config-empty">${escapeHtml(t('config.noStates'))}</div>`;
      return;
    }

    container.innerHTML = active.map(id => {
      const step = WORKFLOW_STEPS.find(s => s.id === id);
      const icon = step ? step.icon : '•';
      const isSelected = id === draft.estadoInicialDefault ? 'selected' : '';
      return `
        <button type="button"
                class="config-default-btn ${isSelected}"
                data-estado="${escapeHtml(id)}">
          ${icon} ${escapeHtml(tState(id))}
        </button>
      `;
    }).join('');
  }

  document.getElementById('configDefaultEstado').addEventListener('click', (e) => {
    const btn = e.target.closest('.config-default-btn');
    if (!btn) return;
    draft.estadoInicialDefault = btn.dataset.estado;
    // Explicit user choice: remember it.
    preferredDefaultState = btn.dataset.estado;
    renderAll();
  });

  // ------------------------------------------------------------
  // Panel: Filters
  // ------------------------------------------------------------
  function getFilterLabel(id) {
    const meta = CONFIG_FILTER_META[id];
    if (meta) return { label: t('filter.' + id), icon: meta.icon, builtin: true };
    const step = WORKFLOW_STEPS.find(s => s.id === id);
    if (step) return { label: tStateShort(id), icon: step.icon, builtin: false };
    return { label: id, icon: '•', builtin: false };
  }

  function renderFilters() {
    const filters = draft.filtros || [];
    document.getElementById('configFiltros').innerHTML = filters.map((f, idx) => {
      const { label, icon, builtin } = getFilterLabel(f.id);
      return `
        <div class="config-filtro-item ${f.visible ? '' : 'oculto'}">
          <div class="drag-info">
            <span class="icon">${icon}</span>
            <span>${escapeHtml(label)}</span>
            ${builtin ? `<span class="builtin-tag">${escapeHtml(t('config.fixed'))}</span>` : ''}
          </div>
          <div class="config-filtro-actions">
            <button type="button"
                    class="config-icon-btn"
                    data-move="up"
                    data-idx="${idx}"
                    ${idx === 0 ? 'disabled' : ''}
                    title="${escapeHtml(t('config.moveUp'))}">↑</button>
            <button type="button"
                    class="config-icon-btn"
                    data-move="down"
                    data-idx="${idx}"
                    ${idx === filters.length - 1 ? 'disabled' : ''}
                    title="${escapeHtml(t('config.moveDown'))}">↓</button>
            <button type="button"
                    class="config-icon-btn ${f.visible ? 'eye-on' : 'eye-off'}"
                    data-toggle="${idx}"
                    title="${f.visible ? t('config.hideFilter') : t('config.showFilter')}">
              ${f.visible ? '👁' : '🚫'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('configFiltros').addEventListener('click', (e) => {
    const moveBtn = e.target.closest('[data-move]');
    if (moveBtn && !moveBtn.disabled) {
      const idx = Number(moveBtn.dataset.idx);
      const dir = moveBtn.dataset.move === 'up' ? -1 : 1;
      const targetIdx = idx + dir;
      const filters = cloneArray(draft.filtros);
      if (targetIdx < 0 || targetIdx >= filters.length) return;
      [filters[idx], filters[targetIdx]] = [filters[targetIdx], filters[idx]];
      draft.filtros = filters;
      renderAll();
      return;
    }

    const toggleBtn = e.target.closest('[data-toggle]');
    if (toggleBtn) {
      const idx = Number(toggleBtn.dataset.toggle);
      const filters = cloneArray(draft.filtros);
      filters[idx] = { ...filters[idx], visible: !filters[idx].visible };
      draft.filtros = filters;
      renderAll();
    }
  });

  // ------------------------------------------------------------
  // Panel: Appearance (logo)
  // ------------------------------------------------------------
  function renderLogos() {
    const current = draft.logo || DEFAULT_LOGO;
    const container = document.getElementById('configLogos');

    container.innerHTML = LOGO_OPTIONS.map(opt => {
      const isSelected = opt.id === current;
      return `
        <button type="button"
                class="config-logo-option ${isSelected ? 'selected' : ''}"
                data-logo="${escapeHtml(opt.id)}">
          <div class="config-logo-preview">${opt.svg}</div>
          <div class="config-logo-info">
            <strong>${escapeHtml(opt.label)}</strong>
            <span>${escapeHtml(opt.description)}</span>
          </div>
          <div class="config-logo-check"></div>
        </button>
      `;
    }).join('');
  }

  document.getElementById('configLogos').addEventListener('click', (e) => {
    const btn = e.target.closest('.config-logo-option');
    if (!btn) return;
    const id = btn.dataset.logo;
    if ((draft.logo || DEFAULT_LOGO) !== id) {
      draft.logo = id;
      renderLogos();
      updateBadge();
    }
  });

  // ------------------------------------------------------------
  // Panel: Appearance (background)
  // ------------------------------------------------------------
  function renderBackgrounds() {
    const current = draft.background || DEFAULT_BACKGROUND;
    const container = document.getElementById('configBgs');
    if (!container) return;

    container.innerHTML = BACKGROUND_OPTIONS.map(opt => {
      const isSelected = opt.id === current;
      const previewClass = opt.id === 'none' ? 'bg-none' : `bg-${opt.id}`;
      return `
        <button type="button"
                class="config-bg-option ${isSelected ? 'selected' : ''}"
                data-bg="${escapeHtml(opt.id)}">
          <div class="config-bg-preview ${previewClass}"></div>
          <div class="config-bg-info">
            <strong>${escapeHtml(opt.label)}</strong>
            <span>${escapeHtml(opt.description)}</span>
          </div>
          <div class="config-bg-check"></div>
        </button>
      `;
    }).join('');
  }

  document.getElementById('configBgs').addEventListener('click', (e) => {
    const btn = e.target.closest('.config-bg-option');
    if (!btn) return;
    const id = btn.dataset.bg;
    if ((draft.background || DEFAULT_BACKGROUND) !== id) {
      draft.background = id;
      applyBackground(id);   // live preview
      renderBackgrounds();
      updateBadge();
    }
  });

  // ------------------------------------------------------------
  // Panel: Language
  // ------------------------------------------------------------
  function renderLangs() {
    const current = draft.lang || DEFAULT_LANG;
    const container = document.getElementById('configLangs');

    container.innerHTML = SUPPORTED_LANGS.map(lang => {
      const selected = lang.id === current;
      return `
        <button type="button"
                class="config-lang-option ${selected ? 'selected' : ''}"
                data-lang="${escapeHtml(lang.id)}">
          <div class="config-lang-flag">${escapeHtml(lang.code)}</div>
          <div class="config-lang-info">
            <strong>${escapeHtml(lang.label)}</strong>
            <span>${escapeHtml(lang.hint)}</span>
          </div>
          <div class="config-lang-check"></div>
        </button>
      `;
    }).join('');
  }

  document.getElementById('configLangs').addEventListener('click', (e) => {
    const btn = e.target.closest('.config-lang-option');
    if (!btn) return;
    const id = btn.dataset.lang;
    if ((draft.lang || DEFAULT_LANG) !== id) {
      draft.lang = id;
      renderLangs();
      updateBadge();
    }
  });

  // ------------------------------------------------------------
  // Panel: Profile
  // ------------------------------------------------------------
  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  }

  function renderPerfil() {
    const p = draft.profile || {};

    setVal('configProfileNombre',   p.nombre   || '');
    setVal('configProfileApellido', p.apellido || '');
    setVal('configProfileUsername', p.username || '');
    setVal('configProfileEmail',    p.email    || '');
    setVal('configProfileBio',      p.bio      || '');

    const av = document.getElementById('configProfileAvatar');
    if (!av) return;
    const svg = av.querySelector('svg');
    let img = av.querySelector('img');

    if (p.avatar) {
      if (svg) svg.style.display = 'none';
      if (!img) {
        img = document.createElement('img');
        img.alt = 'Avatar';
        av.appendChild(img);
      }
      img.src = p.avatar;
    } else {
      if (svg) svg.style.display = '';
      if (img) img.remove();
    }
  }

  // Profile inputs: update the draft without re-rendering everything
  const profileFields = {
    configProfileNombre:   'nombre',
    configProfileApellido: 'apellido',
    configProfileUsername: 'username',
    configProfileEmail:    'email',
    configProfileBio:      'bio',
  };

  Object.entries(profileFields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (!draft) return;
      draft.profile = draft.profile || {};
      draft.profile[key] = el.value;
      updateBadge();
    });
  });

  // Upload photo
  const profileFileInput = document.getElementById('configProfileFileInput');
  const profileUploadBtn = document.getElementById('configProfileUpload');

  if (profileUploadBtn && profileFileInput) {
    profileUploadBtn.addEventListener('click', () => profileFileInput.click());

    profileFileInput.addEventListener('change', () => {
      const file = profileFileInput.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        showToast(t('toast.profileImageTooBig'), '!');
        profileFileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (!draft) return;
        draft.profile = draft.profile || {};
        draft.profile.avatar = ev.target.result;
        renderPerfil();
        updateBadge();
      };
      reader.readAsDataURL(file);
      profileFileInput.value = '';
    });
  }

  // Remove photo
  const profileRemoveBtn = document.getElementById('configProfileRemove');
  if (profileRemoveBtn) {
    profileRemoveBtn.addEventListener('click', () => {
      if (!draft) return;
      draft.profile = draft.profile || {};
      draft.profile.avatar = '';
      renderPerfil();
      updateBadge();
    });
  }

  // ------------------------------------------------------------
  // Re-render the panel labels on language change
  // ------------------------------------------------------------
  document.addEventListener('i18n-changed', () => {
    if (modal.classList.contains('open') && draft) renderAll();
  });

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------
  return { open, close: closeDirect };
}