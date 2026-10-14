// ============================================================
// Controller: config (facade)
//
// Eight tabs, each backed by a panel module under this
// directory. The facade owns the modal lifecycle, the draft,
// the dirty check, and the save/reset flows. Panels only render
// and mutate the draft through the `host` object.
// ============================================================

import { showToast } from '../../ui/feedback/toast.js';
import { showConfirm } from '../../ui/feedback/confirmModal.js';
import { ResetAnimation } from '../../ui/feedback/resetAnimation.js';
import { createModal } from '../../ui/modal.js';
import {
  getDefaultConfig, applyBackground,
  LOGO_OPTIONS, DEFAULT_LOGO, DEFAULT_LANG,
  DEFAULT_BACKGROUND, DEFAULT_DASHBOARD_STYLE,
  STORAGE_KEYS,
} from '../../app/constants.js';
import { emitProfileChanged } from '../../app/events.js';
import { t } from '../../i18n/index.js';

import { mountRolesPanel }      from './rolesPanel.js';
import { mountStatusesPanel }   from './statusesPanel.js';
import { mountFiltersPanel }    from './filtersPanel.js';
import { mountAppearancePanel } from './appearancePanel.js';
import { mountDashboardPanel }  from './dashboardPanel.js';
import { mountLanguagePanel }   from './languagePanel.js';
import { mountProfilePanel }    from './profilePanel.js';
import { mountAdvancedPanel }   from './advancedPanel.js';

/**
 * @param {import('../../app/store.js').Store} configStore
 * @param {import('../../app/store.js').Store} jobsStore
 * @param {import('../../app/store.js').Store} refsStore
 */
export function mountConfigController(configStore, jobsStore, refsStore) {
  const modalEl = document.getElementById('configModal');
  const unsavedBadge = document.getElementById('configUnsavedBadge');

  const resetOverlay = document.getElementById('resetOverlay');
  const resetContent = document.getElementById('resetContent');
  const resetAnim = (resetOverlay && resetContent)
    ? new ResetAnimation(resetOverlay, resetContent)
    : null;

  let draft = null;
  let preferredDefaultStatus = null;

  // ----------------------------------------------------------
  // Modal lifecycle
  // ----------------------------------------------------------
  const configModal = createModal(modalEl, {
    escapeAction: () => tryClose(),
    onClose: () => {
      const saved = configStore.get();
      applyBackground(saved.background || DEFAULT_BACKGROUND);
      applyLogoToBrand(saved.logo || DEFAULT_LOGO);

      draft = null;
      preferredDefaultStatus = null;
      unsavedBadge.classList.remove('visible');
    },
  });

  const unsavedModal = createModal(document.getElementById('unsavedModal'));

  // ----------------------------------------------------------
  // Draft helpers
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // The host object handed to every panel. Panels never hold a
  // reference to `draft` directly — they always go through
  // host.getDraft() so that a `replaceDraft()` (from Reset) is
  // picked up on the next render.
  // ----------------------------------------------------------
  const host = {
    configStore,
    jobsStore,
    refsStore,

    getDraft: () => draft,
    replaceDraft: (next) => { draft = next; },

    updateBadge,
    renderAll,

    showToast,
    showConfirm,
    applyBackground,
    applyLogoToBrand,

    getPreferredDefaultStatus: () => preferredDefaultStatus,
    setPreferredDefaultStatus: (s) => { preferredDefaultStatus = s; },

    openUnsavedModal: () => unsavedModal.open(),
    closeUnsavedModal: () => unsavedModal.close(),
  };

  // ----------------------------------------------------------
  // Mount panels
  // ----------------------------------------------------------
  const panels = {
    roles:      mountRolesPanel(host),
    statuses:   mountStatusesPanel(host),
    filters:    mountFiltersPanel(host),
    appearance: mountAppearancePanel(host),
    dashboard:  mountDashboardPanel(host),
    language:   mountLanguagePanel(host),
    profile:    mountProfilePanel(host),
    advanced:   mountAdvancedPanel(host),
  };

  function renderAll() {
    if (!draft) return;
    panels.roles.render();
    panels.statuses.render();
    panels.filters.render();
    panels.appearance.render();
    panels.dashboard.render();
    panels.language.render();
    panels.profile.render();
    panels.advanced.render();
    updateBadge();
  }

  // ----------------------------------------------------------
  // Open / close flows
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
    if (!draft.dashboardStyleJobs) draft.dashboardStyleJobs = DEFAULT_DASHBOARD_STYLE;
    if (!draft.dashboardStyleRefs) draft.dashboardStyleRefs = DEFAULT_DASHBOARD_STYLE;

    preferredDefaultStatus = draft.defaultInitialStatus || null;

    configModal.open();
    renderAll();
  }

  function closeDirect() {
    configModal.close();
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

    // Notify the rest of the app (session sync + header refresh).
    try {
      emitProfileChanged(next.profile);
    } catch (err) {
      console.error('[Config] profile-changed emit failed', err);
    }
  }

  function tryClose() {
    if (isDraftDirty()) {
      unsavedModal.open();
    } else {
      closeDirect();
    }
  }

  // ----------------------------------------------------------
  // Button wiring
  // ----------------------------------------------------------
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
    showToast(t('toast.savedConfig'), 'icon-check');
  });

  document.getElementById('unsavedCloseBtn').addEventListener('click', () => {
    unsavedModal.close();
  });

  document.getElementById('unsavedDiscard').addEventListener('click', () => {
    unsavedModal.close();
    closeDirect();
    showToast(t('toast.discardedChanges'), 'icon-rotate-ccw');
  });

  document.getElementById('unsavedSave').addEventListener('click', () => {
    unsavedModal.close();
    saveDraft();
    closeDirect();
    showToast(t('toast.savedConfig'), 'icon-check');
  });

  // ----------------------------------------------------------
  // Reset flows (owned by the facade since they touch the draft
  // wholesale and the reset overlay).
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
    unsavedModal.close();

    if (resetAnim) {
      await resetAnim.run(2400);
      await resetAnim.hide();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('resetDataBtn').addEventListener('click', async () => {
    const jobsCount = (jobsStore.get() || []).length;
    const refsCount = (refsStore.get() || []).length;

    if (jobsCount === 0 && refsCount === 0) {
      showToast(t('toast.dataResetEmpty'), 'icon-alert-triangle');
      return;
    }

    const ok = await showConfirm({
      title: t('confirm.resetData.title'),
      message: t('confirm.resetData.message', { jobs: jobsCount, refs: refsCount }),
      confirmText: t('confirm.resetData.confirm'),
      danger: true,
    });
    if (!ok) return;

    saveDraft();

    jobsStore.update(() => []);
    refsStore.update(() => []);

    closeDirect();
    unsavedModal.close();

    showToast(
      t('toast.dataReset', { jobs: jobsCount, refs: refsCount }),
      'icon-trash'
    );

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

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

    try { localStorage.setItem(STORAGE_KEYS.THEME, 'light'); } catch (_) {}
    document.documentElement.setAttribute('data-theme', 'light');

    configStore.update(() => getDefaultConfig());
    jobsStore.update(() => []);
    refsStore.update(() => []);

    draft = getDefaultConfig();
    preferredDefaultStatus = draft.defaultInitialStatus || null;
    closeDirect();
    unsavedModal.close();

    if (resetAnim) {
      await resetAnim.run(2400);
      await resetAnim.hide();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ----------------------------------------------------------
  // Tab switching
  // ----------------------------------------------------------
  const tabs = [...modalEl.querySelectorAll('.config-tab')];
  const tabPanels = [...modalEl.querySelectorAll('.config-panel')];

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      tabPanels.forEach(p => p.classList.toggle('active', p.dataset.panel === target));
      if (target === 'advanced') panels.advanced.refreshStats();
    });
  });

  // ----------------------------------------------------------
  // External subscriptions
  // ----------------------------------------------------------
  document.addEventListener('i18n-changed', () => {
    if (configModal.isOpen() && draft) renderAll();
  });

  configStore.subscribe(() => {
    if (configModal.isOpen() && draft) updateBadge();
  });

  return { open, close: closeDirect };
}