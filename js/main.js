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
import { mountModalsController }    from './controllers/modals/index.js';
import { mountConfigController }    from './controllers/config/index.js';
import { mountCreateRoleController } from './controllers/createRoleController.js';

import { DatePicker }       from './ui/form/datePicker.js';
import { mountChips }       from './ui/form/chips.js';
import { mountInputLimits } from './ui/form/inputLimits.js';

import { applyI18n, setLanguage, getLanguage } from './i18n/index.js';
import {
  requireSession, startSessionHeartbeat,
  getSession, logout, updateSessionProfile,
} from './auth/session.js';
import { migrateLegacyStorage } from './app/migrations.js';
import { emitI18nChanged, onProfileChanged } from './app/events.js';

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

// ------------------------------------------------------------
// Seed the config profile from the session on first boot.
// ------------------------------------------------------------
function seedProfileFromSession(configStore, session) {
  if (!configStore || !session) return;

  const cfg = configStore.get() || {};
  const profile = cfg.profile || {};

  if (profile.seeded) return;

  const nameParts = String(session.name || '').trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ');

  const nextProfile = {
    ...profile,
    firstName: profile.firstName || firstName,
    lastName:  profile.lastName  || lastName,
    email:     profile.email     || session.email || '',
    username:  profile.username  || session.username || '',
    seeded: true,
  };

  configStore.update(c => ({ ...c, profile: nextProfile }));
}

// ------------------------------------------------------------
// Sync the session with the profile after Settings → Profile saves.
// ------------------------------------------------------------
// The header reads `session.name` / `session.email`. When the user
// edits their profile and clicks Save, the config store is updated
// but the session is not — the header would keep showing the name
// from registration. This subscriber patches the session in place
// so the header reflects the new values immediately.
// ------------------------------------------------------------
function syncSessionFromProfile(profile) {
  if (!profile) return;

  const session = getSession();
  if (!session) return;

  const name = [profile.firstName, profile.lastName]
    .map(s => (s || '').trim())
    .filter(Boolean)
    .join(' ');

  updateSessionProfile({
    name,
    email: (profile.email || '').trim(),
  });
}

async function boot() {
  if (!(await requireSession('./login.html'))) return;

  const session = getSession();
  const userId = session?.userId;
  if (!userId) {
    logout();
    window.location.replace('./login.html');
    return;
  }

  try {
    migrateLegacyStorage(userId);
  } catch (err) {
    console.error('[Boot] legacy migration failed', err);
  }

  // ----------------------------------------------------------
  // Stores (scoped to the current user)
  // ----------------------------------------------------------
  const { jobsStore, refsStore, configStore } = createStores(userId);

  // ----------------------------------------------------------
  // Seed the profile from the session before anything subscribes.
  // ----------------------------------------------------------
  try {
    seedProfileFromSession(configStore, session);
  } catch (err) {
    console.error('[Boot] profile seed failed', err);
  }

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
  // Profile-change subscriber: session sync.
  // ----------------------------------------------------------
  onProfileChanged(syncSessionFromProfile);

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

  mountJobsController(
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
  mountFirstRun(jobsStore, refsStore, userId);

  // ----------------------------------------------------------
  // Session heartbeat
  // ----------------------------------------------------------
  startSessionHeartbeat(() => {
    window.location.replace('./login.html');
  });
}