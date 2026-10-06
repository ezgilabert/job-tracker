// ============================================================
// Entry point: wires stores, controllers, and UI
// ============================================================

import { Store } from './store.js';
import {
  STORAGE_KEYS, STORAGE_VERSION, CONFIG_VERSION,
  SAMPLE_JOBS, getDefaultConfig, LOGO_OPTIONS, DEFAULT_LOGO, DEFAULT_LANG,
  BACKGROUND_OPTIONS, DEFAULT_BACKGROUND, applyBackground,
} from './constants.js';
import { mountJobsController } from './controllers/jobsController.js';
import { mountRefsController } from './controllers/refsController.js';
import { mountModalsController } from './controllers/modalsController.js';
import { mountConfigController } from './controllers/configController.js';
import { DatePicker } from './ui/datePicker.js';
import { PuestoCombo } from './ui/combo.js';
import { mountChips } from './ui/chips.js';
import { mountInputLimits } from './ui/inputLimits.js';
import { ensureArray } from './utils.js';
import { applyI18n, setLanguage, getLanguage } from './i18n.js';
import { logout, getSession } from './auth/session.js';

// ------------------------------------------------------------
// La app ya no exige sesión para entrar: se puede usar como
// invitado. El menú de usuario contiene Configuración, Tema,
// y Login/Logout según corresponda.
// ------------------------------------------------------------
boot();

function boot() {
  // ----------------------------------------------------------
  // Theme (vive dentro del menú de usuario)
  // ----------------------------------------------------------
  function mountTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', saved);

    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEYS.THEME, next);
    });
  }

  // ----------------------------------------------------------
  // Logo (appearance)
  // ----------------------------------------------------------
  function applyLogo(logoId) {
    const el = document.getElementById('brandLogo');
    if (!el) return;
    const option = LOGO_OPTIONS.find(o => o.id === logoId) || LOGO_OPTIONS[0];
    el.innerHTML = option.svg;
  }

  // ----------------------------------------------------------
  // User menu
  // ----------------------------------------------------------
  function mountUserMenu() {
    const menu = document.getElementById('userMenu');
    const btn = document.getElementById('userBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtn = document.getElementById('loginBtn');
    const configBtn = document.getElementById('configBtn');
    const userHeader = document.getElementById('userMenuHeader');
    const nameEl = document.getElementById('userMenuName');
    const emailEl = document.getElementById('userMenuEmail');

    if (!menu || !btn) return;

    function refresh() {
      const session = getSession();
      const logged = !!session;

      if (logged) {
        const displayName = session.name
          || (session.email ? session.email.split('@')[0] : 'User');
        const displayEmail = session.guest
          ? 'Guest session'
          : (session.email || '');

        if (nameEl) nameEl.textContent = displayName;
        if (emailEl) emailEl.textContent = displayEmail;

        if (userHeader) userHeader.style.display = '';
        if (loginBtn)   loginBtn.style.display = 'none';
        if (logoutBtn)  logoutBtn.style.display = '';
      } else {
        if (userHeader) userHeader.style.display = 'none';
        if (loginBtn)   loginBtn.style.display = '';
        if (logoutBtn)  logoutBtn.style.display = 'none';
      }
    }

    refresh();

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (menu.classList.contains('open') && !menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        menu.classList.remove('open');
      }
    });

    if (configBtn) {
      configBtn.addEventListener('click', () => {
        menu.classList.remove('open');
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        logout();
        menu.classList.remove('open');
        refresh();
      });
    }

    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        window.location.href = './login.html';
      });
    }

    document.addEventListener('i18n-changed', refresh);
  }

  // ----------------------------------------------------------
  // Stores
  // ----------------------------------------------------------
  const jobsStore = new Store(STORAGE_KEYS.JOBS, [], {
    version: STORAGE_VERSION,
    seed: () => SAMPLE_JOBS.map(j => ({ ...j })),
    migrate: (data) => {
      if (Array.isArray(data)) {
        return data.map(j => ({
          ...j,
          contacto: j.contacto ?? '',
          skipped: ensureArray(j.skipped),
          volvioAtras: Boolean(j.volvioAtras),
          history: Array.isArray(j.history) && j.history.length
            ? j.history
            : [{ estado: j.estado, fecha: new Date().toISOString() }],
        }));
      }
      return data;
    },
  });

  const refsStore = new Store(STORAGE_KEYS.REFS, [], {
    version: STORAGE_VERSION,
    migrate: (data) => {
      if (Array.isArray(data)) {
        return data.map(r => ({
          ...r,
          estado: r.estado || 'Pendiente',
          link: r.link ?? r.linkedin ?? '',
          empresasVinculadas: ensureArray(r.empresasVinculadas),
          volvioAtras: Boolean(r.volvioAtras),
          history: Array.isArray(r.history) && r.history.length
            ? r.history
            : [{ estado: r.estado || 'Pendiente', fecha: r.createdAt || new Date().toISOString() }],
        }));
      }
      return data;
    },
  });

  const configStore = new Store(STORAGE_KEYS.CONFIG, getDefaultConfig(), {
    version: CONFIG_VERSION,
    seed: () => getDefaultConfig(),
  });

  // ----------------------------------------------------------
  // i18n: apply language at boot
  // ----------------------------------------------------------
  setLanguage(configStore.get().lang || DEFAULT_LANG);
  applyI18n(document);

  // React to config changes (logo + language + background)
  configStore.subscribe(cfg => {
    applyLogo(cfg.logo || DEFAULT_LOGO);
    applyBackground(cfg.background || DEFAULT_BACKGROUND);

    const lang = cfg.lang || DEFAULT_LANG;
    if (lang !== getLanguage()) {
      setLanguage(lang);
      applyI18n(document);
      document.dispatchEvent(new CustomEvent('i18n-changed'));
    }
  });

  // ----------------------------------------------------------
  // UI: date picker, role combo, referral chips
  // ----------------------------------------------------------
  const fechaPicker = new DatePicker(document.getElementById('fechaPicker'), {
    onChange: () => {},
  });

  const puestoCombo = new PuestoCombo(document.getElementById('puestoCombo'), {
    getJobPuestos: () => jobsStore.get().map(j => j.puesto),
    getConfig: () => configStore.get(),
  });

  const refRelacionChips = mountChips(document.getElementById('refRelacionChips'));
  const refEstadoChips = mountChips(document.getElementById('refEstadoChips'));

  // ----------------------------------------------------------
  // Input limits: maxlength counters + paste sanitizer
  // ----------------------------------------------------------
  mountInputLimits(document);

  // ----------------------------------------------------------
  // Controllers
  // ----------------------------------------------------------
  mountConfigController(configStore);
  const modals = mountModalsController(jobsStore, refsStore, configStore);
  const jobsCtrl = mountJobsController(jobsStore, refsStore, modals, fechaPicker, configStore);
  const refsCtrl = mountRefsController(jobsStore, refsStore, modals);

  refsCtrl.initChips(refRelacionChips, refEstadoChips);

  mountTheme();
  mountUserMenu();

  // ----------------------------------------------------------
  // Re-render dynamic controllers on language change
  // ----------------------------------------------------------
  document.addEventListener('i18n-changed', () => {
    if (jobsCtrl?.renderList) jobsCtrl.renderList();
    if (refsCtrl?.renderRefs) refsCtrl.renderRefs();
  });
}