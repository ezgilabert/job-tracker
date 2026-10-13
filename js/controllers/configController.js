// ============================================================
// Controller: config
// ============================================================

import { showToast } from '../ui/toast.js';
import { showConfirm } from '../ui/confirmModal.js';
import { ResetAnimation } from '../ui/resetAnimation.js';
import {
  ROLE_TAGS_LIST, ROLE_TAGS, DEFAULT_ROLES,
  WORKFLOW_STEPS, CONFIG_FILTER_META, getDefaultConfig,
  LOGO_OPTIONS, DEFAULT_LOGO, DEFAULT_LANG,
  BACKGROUND_OPTIONS, DEFAULT_BACKGROUND, applyBackground,
  DASHBOARD_STYLES, DEFAULT_DASHBOARD_STYLE, DASHBOARD_STYLE_META,
  NO_ROLE_VALUE,
  BACKUP_APP_ID, BACKUP_VERSION,
  STORAGE_KEYS,
} from '../constants.js';
import { escapeHtml, cloneArray } from '../utils.js';
import {
  SUPPORTED_LANGS, t, tState, tStateShort,
} from '../i18n.js';

/**
 * @param {import('../store.js').Store} configStore
 * @param {import('../store.js').Store} jobsStore
 * @param {import('../store.js').Store} refsStore
 */
export function mountConfigController(configStore, jobsStore, refsStore) {
  const modal = document.getElementById('configModal');
  const unsavedModal = document.getElementById('unsavedModal');
  const unsavedBadge = document.getElementById('configUnsavedBadge');

  const tabs = [...modal.querySelectorAll('.config-tab')];
  const panels = [...modal.querySelectorAll('.config-panel')];

  const resetOverlay = document.getElementById('resetOverlay');
  const resetContent = document.getElementById('resetContent');
  const resetAnim = (resetOverlay && resetContent)
    ? new ResetAnimation(resetOverlay, resetContent)
    : null;

  let draft = null;
  let preferredDefaultStatus = null;

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

  /**
   * Normalizes ordering-sensitive arrays so the dirty check doesn't
   * flag a change when the user just reorders the same set of items.
   */
  function normalizeForDirtyCheck(cfg) {
    const copy = cloneConfig(cfg || {});
    if (copy.roles) {
      if (Array.isArray(copy.roles.activeTags)) {
        copy.roles.activeTags = [...copy.roles.activeTags].sort();
      }
      if (Array.isArray(copy.roles.hidden)) {
        copy.roles.hidden = [...copy.roles.hidden].sort();
      }
      if (Array.isArray(copy.roles.custom)) {
        copy.roles.custom = [...copy.roles.custom].sort();
      }
      if (copy.roles.customTags && typeof copy.roles.customTags === 'object') {
        const sorted = {};
        Object.keys(copy.roles.customTags).sort().forEach(k => {
          sorted[k] = [...copy.roles.customTags[k]].sort();
        });
        copy.roles.customTags = sorted;
      }
    }
    if (Array.isArray(copy.initialStatuses)) {
      copy.initialStatuses = [...copy.initialStatuses].sort();
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

  function applyLogoToBrand(logoId) {
    const el = document.getElementById('brandLogo');
    if (!el) return;
    const option = LOGO_OPTIONS.find(o => o.id === logoId) || LOGO_OPTIONS[0];
    el.innerHTML = option.svg;
  }

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
    if (!draft.dashboardStyleJobs) draft.dashboardStyleJobs = DEFAULT_DASHBOARD_STYLE;
    if (!draft.dashboardStyleRefs) draft.dashboardStyleRefs = DEFAULT_DASHBOARD_STYLE;

    preferredDefaultStatus = draft.defaultInitialStatus || null;

    modal.classList.add('open');
    renderAll();
  }

  function closeDirect() {
    const saved = configStore.get();
    applyBackground(saved.background || DEFAULT_BACKGROUND);
    applyLogoToBrand(saved.logo || DEFAULT_LOGO);

    draft = null;
    preferredDefaultStatus = null;
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
    if (!next.dashboardStyleJobs) next.dashboardStyleJobs = DEFAULT_DASHBOARD_STYLE;
    if (!next.dashboardStyleRefs) next.dashboardStyleRefs = DEFAULT_DASHBOARD_STYLE;
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
    if (resetOverlay && resetOverlay.classList.contains('active')) return;

    if (unsavedModal.classList.contains('open')) {
      unsavedModal.classList.remove('open');
      return;
    }
    if (modal.classList.contains('open')) tryClose();
  });

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

  // ----------------------------------------------------------
  // Reset preferences (config only)
  //   No page reload: resets the in-memory stores so subscribers
  //   re-render. This avoids passing through the auth guard and
  //   being redirected to login.html.
  // ----------------------------------------------------------
  document.getElementById('resetConfigBtn').addEventListener('click', async () => {
    const ok = await showConfirm({
      title: t('confirm.resetConfig.title'),
      message: t('confirm.resetConfig.message'),
      confirmText: t('confirm.resetConfig.confirm'),
      danger: true,
    });
    if (!ok) return;

    draft = getDefaultConfig();
    preferredDefaultStatus = draft.defaultInitialStatus || null;
    renderAll();

    saveDraft();
    closeDirect();
    unsavedModal.classList.remove('open');

    if (resetAnim) {
      await resetAnim.run(2400);
      await resetAnim.hide();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ----------------------------------------------------------
  // Delete data (jobs + refs). Config untouched. No reload.
  // ----------------------------------------------------------
  document.getElementById('resetDataBtn').addEventListener('click', async () => {
    const jobsCount = (jobsStore.get() || []).length;
    const refsCount = (refsStore.get() || []).length;

    if (jobsCount === 0 && refsCount === 0) {
      showToast(t('toast.dataResetEmpty'), '—');
      return;
    }

    const ok = await showConfirm({
      title: t('confirm.resetData.title'),
      message: t('confirm.resetData.message', { jobs: jobsCount, refs: refsCount }),
      confirmText: t('confirm.resetData.confirm'),
      danger: true,
    });
    if (!ok) return;

    // Persist any pending config edits before closing.
    saveDraft();

    jobsStore.update(() => []);
    refsStore.update(() => []);

    closeDirect();
    unsavedModal.classList.remove('open');

    showToast(
      t('toast.dataReset', { jobs: jobsCount, refs: refsCount }),
      '🗑️'
    );

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ----------------------------------------------------------
  // Reset everything (config + data + theme). No reload.
  // ----------------------------------------------------------
  document.getElementById('resetAllBtn').addEventListener('click', async () => {
    const jobsCount = (jobsStore.get() || []).length;
    const refsCount = (refsStore.get() || []).length;

    const ok = await showConfirm({
      title: t('confirm.resetAll.title'),
      message: t('confirm.resetAll.message', { jobs: jobsCount, refs: refsCount }),
      confirmText: t('confirm.resetAll.confirm'),
      danger: true,
    });
    if (!ok) return;

    // Theme lives outside the config store, reset it manually.
    try { localStorage.setItem(STORAGE_KEYS.THEME, 'light'); } catch (_) {}
    document.documentElement.setAttribute('data-theme', 'light');

    configStore.update(() => getDefaultConfig());
    jobsStore.update(() => []);
    refsStore.update(() => []);

    draft = getDefaultConfig();
    preferredDefaultStatus = draft.defaultInitialStatus || null;
    closeDirect();
    unsavedModal.classList.remove('open');

    if (resetAnim) {
      await resetAnim.run(2400);
      await resetAnim.hide();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      panels.forEach(p => p.classList.toggle('active', p.dataset.panel === target));
      if (target === 'advanced') renderBackupStats();
    });
  });

  function renderAll() {
    if (!draft) return;
    renderTags();
    renderRolesList();
    renderHiddenList();
    renderStatusCheckboxes();
    renderDefaultStatus();
    renderFilters();
    renderLogos();
    renderBackgrounds();
    renderDashboardsJobs();
    renderDashboardsRefs();
    renderLangs();
    renderProfile();
    renderBackupStats();
    updateBadge();
  }

  // ------------------------------------------------------------
  // Panel: Roles
  // ------------------------------------------------------------
  function renderTags() {
    const active = new Set(draft.roles.activeTags || []);
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
    const active = new Set(draft.roles.activeTags || []);
    if (active.has(tag)) active.delete(tag);
    else active.add(tag);
    draft.roles.activeTags = [...active];
    renderAll();
  });

  function getVisibleRoles() {
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
    const list = getVisibleRoles();
    const container = document.getElementById('configRolesList');
    document.getElementById('configRolesCount').textContent = list.length;

    if (list.length === 0) {
      container.innerHTML = `<div class="config-empty">${escapeHtml(t('config.noRoles'))}</div>`;
      return;
    }

    container.innerHTML = list.map(p => {
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

  document.getElementById('configRolesList').addEventListener('click', (e) => {
    const btn = e.target.closest('.remove');
    if (!btn) return;
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
    renderAll();
  });

  function renderHiddenList() {
    const hidden = draft.roles.hidden || [];
    const section = document.getElementById('configHiddenSection');
    const container = document.getElementById('configHiddenList');

    if (hidden.length === 0) {
      section.style.display = 'none';
      return;
    }
    section.style.display = 'block';

    container.innerHTML = hidden.map(p => `
      <div class="config-role-item hidden-role">
        <span>${escapeHtml(p)}</span>
        <button type="button" class="restore" data-role="${escapeHtml(p)}" title="${t('config.restore')}">+</button>
      </div>
    `).join('');
  }

  document.getElementById('configHiddenList').addEventListener('click', (e) => {
    const btn = e.target.closest('.restore');
    if (!btn) return;
    const role = btn.dataset.role;
    draft.roles.hidden = (draft.roles.hidden || []).filter(p => p !== role);
    renderAll();
  });

  const newRoleInput = document.getElementById('configNewRole');

  function addCustomRole() {
    const value = newRoleInput.value.trim();
    if (!value) return;
    const alreadyExists = (draft.roles.custom || []).includes(value) || DEFAULT_ROLES.includes(value);
    if (alreadyExists) {
      showToast(t('toast.roleExists'), '!');
      return;
    }
    draft.roles.custom = [...(draft.roles.custom || []), value];
    draft.roles.hidden = (draft.roles.hidden || []).filter(p => p !== value);
    newRoleInput.value = '';
    renderAll();
    showToast(t('toast.roleAdded'), '✓');
  }

  document.getElementById('configAddRole').addEventListener('click', addCustomRole);
  newRoleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCustomRole(); }
  });

  // ------------------------------------------------------------
  // Panel: Initial statuses
  // ------------------------------------------------------------
  function renderStatusCheckboxes() {
    const active = new Set(draft.initialStatuses || []);
    document.getElementById('configStatuses').innerHTML = WORKFLOW_STEPS.map(s => {
      const checked = active.has(s.id);
      return `
        <label class="config-check ${checked ? 'checked' : ''}">
          <input type="checkbox" data-status="${escapeHtml(s.id)}" ${checked ? 'checked' : ''}>
          <span class="icon">${s.icon}</span>
          <span>${escapeHtml(tState(s.id))}</span>
        </label>
      `;
    }).join('');
  }

  document.getElementById('configStatuses').addEventListener('change', (e) => {
    const input = e.target.closest('input[type="checkbox"]');
    if (!input) return;
    const status = input.dataset.status;
    const statusSet = new Set(draft.initialStatuses || []);

    if (input.checked) {
      statusSet.add(status);
      if (status === preferredDefaultStatus) {
        draft.defaultInitialStatus = status;
      }
    } else {
      statusSet.delete(status);
    }

    draft.initialStatuses = [...statusSet];

    if (statusSet.size > 0 && !statusSet.has(draft.defaultInitialStatus)) {
      draft.defaultInitialStatus = [...statusSet][0];
    }

    renderAll();
  });

  function renderDefaultStatus() {
    const active = draft.initialStatuses || [];
    const container = document.getElementById('configDefaultStatus');

    if (active.length === 0) {
      container.innerHTML = `<div class="config-empty">${escapeHtml(t('config.noStates'))}</div>`;
      return;
    }

    container.innerHTML = active.map(id => {
      const step = WORKFLOW_STEPS.find(s => s.id === id);
      const icon = step ? step.icon : '•';
      const isSelected = id === draft.defaultInitialStatus ? 'selected' : '';
      return `
        <button type="button"
                class="config-default-btn ${isSelected}"
                data-status="${escapeHtml(id)}">
          ${icon} ${escapeHtml(tState(id))}
        </button>
      `;
    }).join('');
  }

  document.getElementById('configDefaultStatus').addEventListener('click', (e) => {
    const btn = e.target.closest('.config-default-btn');
    if (!btn) return;
    draft.defaultInitialStatus = btn.dataset.status;
    preferredDefaultStatus = btn.dataset.status;
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
    const filters = draft.filters || [];
    document.getElementById('configFilters').innerHTML = filters.map((f, idx) => {
      const { label, icon, builtin } = getFilterLabel(f.id);
      return `
        <div class="config-filter-item ${f.visible ? '' : 'hidden'}">
          <div class="drag-info">
            <span class="icon">${icon}</span>
            <span>${escapeHtml(label)}</span>
            ${builtin ? `<span class="builtin-tag">${escapeHtml(t('config.fixed'))}</span>` : ''}
          </div>
          <div class="config-filter-actions">
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

  document.getElementById('configFilters').addEventListener('click', (e) => {
    const moveBtn = e.target.closest('[data-move]');
    if (moveBtn && !moveBtn.disabled) {
      const idx = Number(moveBtn.dataset.idx);
      const dir = moveBtn.dataset.move === 'up' ? -1 : 1;
      const targetIdx = idx + dir;
      const filters = cloneArray(draft.filters);
      if (targetIdx < 0 || targetIdx >= filters.length) return;
      [filters[idx], filters[targetIdx]] = [filters[targetIdx], filters[idx]];
      draft.filters = filters;
      renderAll();
      return;
    }

    const toggleBtn = e.target.closest('[data-toggle]');
    if (toggleBtn) {
      const idx = Number(toggleBtn.dataset.toggle);
      const filters = cloneArray(draft.filters);
      filters[idx] = { ...filters[idx], visible: !filters[idx].visible };
      draft.filters = filters;
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
      applyBackground(id);
      renderBackgrounds();
      updateBadge();
    }
  });

  // ------------------------------------------------------------
  // Panel: Dashboard (jobs + refs)
  // ------------------------------------------------------------
  const NEW_STYLES = ['minimal', 'compact', 'circular', 'heatmap'];

  function renderDashboardsJobs() {
    const container = document.getElementById('configDashJobs');
    if (!container) return;
    renderDashGrid(container, 'dashboardStyleJobs', draft.dashboardStyleJobs || DEFAULT_DASHBOARD_STYLE);
  }

  function renderDashboardsRefs() {
    const container = document.getElementById('configDashRefs');
    if (!container) return;
    renderDashGrid(container, 'dashboardStyleRefs', draft.dashboardStyleRefs || DEFAULT_DASHBOARD_STYLE);
  }

  function renderDashGrid(container, field, current) {
    container.innerHTML = DASHBOARD_STYLE_META.map(opt => {
      const isSelected = opt.id === current;
      const badge = NEW_STYLES.includes(opt.id)
        ? `<span class="config-dash-badge-new">${escapeHtml(t('config.dashboard.new'))}</span>`
        : '';
      return `
        <button type="button"
                class="config-dash-option ${isSelected ? 'selected' : ''}"
                data-field="${field}"
                data-dash="${escapeHtml(opt.id)}">
          <div class="config-dash-preview ${opt.preview}"></div>
          <div class="config-dash-info">
            <strong>${escapeHtml(t(opt.labelKey))}${badge}</strong>
            <span>${escapeHtml(t(opt.descKey))}</span>
          </div>
        </button>
      `;
    }).join('');
  }

  function handleDashClick(e) {
    const btn = e.target.closest('.config-dash-option');
    if (!btn) return;
    const id = btn.dataset.dash;
    const field = btn.dataset.field;
    if (!DASHBOARD_STYLES.includes(id)) return;
    if (draft[field] === id) return;

    draft[field] = id;

    if (field === 'dashboardStyleJobs') renderDashboardsJobs();
    else if (field === 'dashboardStyleRefs') renderDashboardsRefs();

    updateBadge();
  }

  const dashJobsEl = document.getElementById('configDashJobs');
  const dashRefsEl = document.getElementById('configDashRefs');
  if (dashJobsEl) dashJobsEl.addEventListener('click', handleDashClick);
  if (dashRefsEl) dashRefsEl.addEventListener('click', handleDashClick);

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

  function renderProfile() {
    const p = draft.profile || {};

    setVal('configProfileFirstName', p.firstName || '');
    setVal('configProfileLastName',  p.lastName  || '');
    setVal('configProfileUsername',  p.username  || '');
    setVal('configProfileEmail',     p.email     || '');
    setVal('configProfileBio',       p.bio       || '');

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

  const profileFields = {
    configProfileFirstName: 'firstName',
    configProfileLastName:  'lastName',
    configProfileUsername:  'username',
    configProfileEmail:     'email',
    configProfileBio:       'bio',
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
        renderProfile();
        updateBadge();
      };
      reader.readAsDataURL(file);
      profileFileInput.value = '';
    });
  }

  const profileRemoveBtn = document.getElementById('configProfileRemove');
  if (profileRemoveBtn) {
    profileRemoveBtn.addEventListener('click', () => {
      if (!draft) return;
      draft.profile = draft.profile || {};
      draft.profile.avatar = '';
      renderProfile();
      updateBadge();
    });
  }

  // ------------------------------------------------------------
  // Panel: Data & Backup (Advanced)
  // ------------------------------------------------------------
  function renderBackupStats() {
    const container = document.getElementById('configBackupStats');
    if (!container) return;

    const jobs = jobsStore ? jobsStore.get() : [];
    const refs = refsStore ? refsStore.get() : [];
    const jobsCount = Array.isArray(jobs) ? jobs.length : 0;
    const refsCount = Array.isArray(refs) ? refs.length : 0;

    container.innerHTML = `
      <span class="config-backup-stat">📋 ${jobsCount} ${escapeHtml(t('config.backup.jobs'))}</span>
      <span class="config-backup-stat">🤝 ${refsCount} ${escapeHtml(t('config.backup.refs'))}</span>
    `;
  }

  function buildBackupPayload() {
    const theme = (() => {
      try { return localStorage.getItem(STORAGE_KEYS.THEME) || 'light'; }
      catch { return 'light'; }
    })();

    return {
      app: BACKUP_APP_ID,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        jobs: jobsStore ? jobsStore.get() : [],
        refs: refsStore ? refsStore.get() : [],
        config: configStore.get(),
        theme,
      },
    };
  }

  function exportBackup() {
    const payload = buildBackupPayload();
    const json = JSON.stringify(payload, null, 2);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `job-tracker-backup-${date}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(t('toast.backupExported'), '⬇');
  }

  function validateBackup(parsed) {
    if (!parsed || typeof parsed !== 'object') return false;
    if (parsed.app !== BACKUP_APP_ID) return false;
    if (!parsed.data || typeof parsed.data !== 'object') return false;
    return true;
  }

  async function importBackupFromFile(file) {
    let text;
    try {
      text = await file.text();
    } catch {
      showToast(t('toast.backupInvalid'), '⚠️');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      showToast(t('toast.backupInvalid'), '⚠️');
      return;
    }

    if (!validateBackup(parsed)) {
      showToast(t('toast.backupInvalid'), '⚠️');
      return;
    }

    const data = parsed.data || {};
    const jobsCount = Array.isArray(data.jobs) ? data.jobs.length : 0;
    const refsCount = Array.isArray(data.refs) ? data.refs.length : 0;

    const ok = await showConfirm({
      title: t('confirm.importBackup.title'),
      message: t('confirm.importBackup.message', {
        jobs: jobsCount,
        refs: refsCount,
      }),
      confirmText: t('confirm.importBackup.confirm'),
      danger: true,
    });
    if (!ok) return;

    if (data.config && typeof data.config === 'object') {
      configStore.update(() => data.config);
    }
    if (Array.isArray(data.refs)) {
      refsStore.update(() => data.refs);
    }
    if (Array.isArray(data.jobs)) {
      jobsStore.update(() => data.jobs);
    }
    if (data.theme === 'light' || data.theme === 'dark') {
      try { localStorage.setItem(STORAGE_KEYS.THEME, data.theme); } catch {}
      document.documentElement.setAttribute('data-theme', data.theme);
    }

    closeDirect();

    showToast(
      t('toast.backupImported', { jobs: jobsCount, refs: refsCount }),
      '⬆'
    );
  }

  const exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportBackup);

  const importBtn = document.getElementById('importDataBtn');
  const importInput = document.getElementById('importDataInput');
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => {
      const file = importInput.files?.[0];
      if (!file) return;
      importBackupFromFile(file);
      importInput.value = '';
    });
  }

  document.addEventListener('i18n-changed', () => {
    if (modal.classList.contains('open') && draft) renderAll();
  });

  return { open, close: closeDirect };
}