// ============================================================
// Entry point: wires stores, controllers, and UI.
//
// The heavy lifting lives in ./boot/* — this file only
// orchestrates.
// ============================================================

import {
  DEFAULT_LANG, DEFAULT_LOGO, DEFAULT_BACKGROUND, applyBackground,
} from './app/constants.js';

import { createStores }    from './boot/stores.js';
import { mountTheme, applyLogo } from './boot/theme.js';
import { mountUserMenu }   from './boot/userMenu.js';
import { pulseI18nTexts }  from './boot/i18nPulse.js';
import { mountKeyboardShortcuts } from './boot/keyboard.js';
import { mountFirstRun }   from './boot/firstRun.js';

import { mountJobsController }      from './controllers/jobsController.js';
import { mountRefsController }      from './controllers/refsController.js';
import { mountModalsController }    from './controllers/modalsController.js';
import { mountConfigController }    from './controllers/configController.js';
import { mountCreateRoleController } from './controllers/createRoleController.js';

import { DatePicker }       from './ui/form/datePicker.js';
import { mountChips }       from './ui/form/chips.js';
import { mountInputLimits } from './ui/form/inputLimits.js';

import { applyI18n, setLanguage, getLanguage } from './i18n/index.js';
import { requireSession, startSessionHeartbeat } from './auth/session.js';
import { emitI18nChanged, onI18nChanged } from './app/events.js';

// ------------------------------------------------------------
// Global error handlers — surface anything that slips through.
// Installed at module load, before boot() runs.
// ------------------------------------------------------------
window.addEventListener('error', (e) => {
  console.error('[Global error]', e.error || e.message, e);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled promise rejection]', e.reason);
});

boot();

async function boot() {
  if (!(await requireSession('./login.html'))) return;

  // ----------------------------------------------------------
  // Stores
  // ----------------------------------------------------------
  const { jobsStore, refsStore, configStore } = createStores();

  // ----------------------------------------------------------
  // i18n boot: language + initial apply, plus a subscriber that
  // reacts to config changes (logo, background, language).
  // ----------------------------------------------------------
  setLanguage(configStore.get().lang || DEFAULT_LANG);
  applyI18n(document);

  configStore.subscribe(cfg => {
    applyLogo(cfg.logo || DEFAULT_LOGO);
    applyBackground(cfg.background || DEFAULT_BACKGROUND);

    const lang = cfg.lang || DEFAULT_LANG;
    if (lang !== getLanguage()) {
      setLanguage(lang);
      applyI18n(document);
      pulseI18nTexts();
      emitI18nChanged();
    }
  });

  // ----------------------------------------------------------
  // Shared UI widgets
  // ----------------------------------------------------------
  const datePicker = new DatePicker(document.getElementById('datePicker'), {
    onChange: () => {},
  });

  const refRelationshipChips = mountChips(
    document.getElementById('refRelationshipChips'),
    { allowMultiple: true }
  );
  const refStatusChips = mountChips(document.getElementById('refStatusChips'));

  mountInputLimits(document);

  // ----------------------------------------------------------
  // Controllers
  // ----------------------------------------------------------
  const createRoleCtrl = mountCreateRoleController(configStore);

  mountConfigController(configStore, jobsStore, refsStore);

  const modals = mountModalsController(
    jobsStore, refsStore, configStore, createRoleCtrl
  );

  const jobsCtrl = mountJobsController(
    jobsStore, refsStore, modals, datePicker, configStore, createRoleCtrl
  );

  const refsCtrl = mountRefsController(
    jobsStore, refsStore, modals, configStore
  );

  refsCtrl.initChips(refRelationshipChips, refStatusChips);

  // ----------------------------------------------------------
  // Theme + header + keyboard shortcuts + first-run banner
  // ----------------------------------------------------------
  mountTheme();
  mountUserMenu(configStore);
  mountKeyboardShortcuts();
  mountFirstRun(jobsStore, refsStore);

  // ----------------------------------------------------------
  // Session heartbeat
  // ----------------------------------------------------------
  startSessionHeartbeat(() => {
    window.location.replace('./login.html');
  });

  // ----------------------------------------------------------
  // Re-render lists when the language changes (the pulse is
  // triggered by the config subscriber above).
  // ----------------------------------------------------------
  onI18nChanged(() => {
    if (jobsCtrl?.renderList) jobsCtrl.renderList();
    if (refsCtrl?.renderRefs) refsCtrl.renderRefs();
  });
}