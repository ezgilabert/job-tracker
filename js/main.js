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
import { mountCreatePuestoController } from './controllers/createPuestoController.js';
import { DatePicker } from './ui/datePicker.js';
import { mountChips } from './ui/chips.js';
import { mountInputLimits } from './ui/inputLimits.js';
import { ensureArray } from './utils.js';
import { applyI18n, setLanguage, getLanguage } from './i18n.js';
import {
  logout, getSession, requireSession, startSessionHeartbeat,
} from './auth/session.js';

boot();

async function boot() {
  if (!(await requireSession('./login.html'))) return;

  // ----------------------------------------------------------
  // Stagger de textos al cambiar idioma.
  // Se llama SÍNCRONAMENTE después de aplicar el nuevo idioma,
  // cuando el DOM ya tiene los textos actualizados.
  // ----------------------------------------------------------
  function staggerI18nTexts() {
    const all = document.querySelectorAll('.container [data-i18n]');
    const visible = [];

    all.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) visible.push(el);
    });

    if (!visible.length) return;

    // 1) Cancelar cualquier animación previa (evita estados pegados)
    visible.forEach(el => {
      el.classList.remove('i18n-stagger');
      if (typeof el.getAnimations === 'function') {
        el.getAnimations().forEach(a => {
          try { a.cancel(); } catch (_) { /* noop */ }
        });
      }
    });

    // 2) Un solo reflow global antes de reanimar.
    //    Esto garantiza que el navegador registre el estado "sin animación".
    void document.body.offsetWidth;

    // 3) Aplicar delays y la clase de animación.
    visible.forEach((el, i) => {
      el.style.animationDelay = Math.min(i * 15, 400) + 'ms';
      el.classList.add('i18n-stagger');
    });

    // 4) Limpieza después de que terminen todas las animaciones.
    const maxDelay = Math.min((visible.length - 1) * 15, 400);
    const totalMs = 350 + maxDelay + 120;

    setTimeout(() => {
      visible.forEach(el => {
        el.classList.remove('i18n-stagger');
        el.style.animationDelay = '';
      });
    }, totalMs);
  }

  // ----------------------------------------------------------
  // Ripple radial para el cambio de tema
  // ----------------------------------------------------------
  function triggerThemeRipple(x, y, nextTheme, onPeak) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const dx = Math.max(x, vw - x);
    const dy = Math.max(y, vh - y);
    const radius = Math.sqrt(dx * dx + dy * dy) * 1.05;
    const size = radius * 2;

    const ripple = document.createElement('div');
    ripple.className = 'theme-ripple';
    ripple.style.width  = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left   = (x - radius) + 'px';
    ripple.style.top    = (y - radius) + 'px';

    document.body.appendChild(ripple);
    void ripple.offsetWidth;
    ripple.classList.add('run');

    setTimeout(() => {
      if (typeof onPeak === 'function') onPeak();
    }, 380);

    setTimeout(() => {
      ripple.remove();
    }, 900);
  }

  // ----------------------------------------------------------
  // Theme
  // ----------------------------------------------------------
  function mountTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', saved);

    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';

      const rect = btn.getBoundingClientRect();
      const x = (typeof e.clientX === 'number' && e.clientX > 0)
        ? e.clientX
        : rect.left + rect.width / 2;
      const y = (typeof e.clientY === 'number' && e.clientY > 0)
        ? e.clientY
        : rect.top + rect.height / 2;

      triggerThemeRipple(x, y, next, () => {
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(STORAGE_KEYS.THEME, next);
      });
    });
  }

  function applyLogo(logoId) {
    const el = document.getElementById('brandLogo');
    if (!el) return;
    const option = LOGO_OPTIONS.find(o => o.id === logoId) || LOGO_OPTIONS[0];
    el.innerHTML = option.svg;
  }

  // ----------------------------------------------------------
  // User menu
  // ----------------------------------------------------------
  function mountUserMenu(configStore) {
    const menu = document.getElementById('userMenu');
    const btn = document.getElementById('userBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtn = document.getElementById('loginBtn');
    const configBtn = document.getElementById('configBtn');
    const userHeader = document.getElementById('userMenuHeader');
    const nameEl = document.getElementById('userMenuName');
    const emailEl = document.getElementById('userMenuEmail');
    const langBtn = document.getElementById('langToggle');

    if (!menu || !btn) return;

    function refresh() {
      const session = getSession();
      const logged = !!session;

      if (logged) {
        const displayName = session.name
          || (session.email ? session.email.split('@')[0] : 'User');
        const displayEmail = session.email || '';

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
        window.location.href = './login.html';
      });
    }

    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        window.location.href = './login.html';
      });
    }

    // ⭐ CAMBIO: el stagger se dispara acá, síncronamente después del update.
    // Como configStore.update() corre el subscriber que hace applyI18n() +
    // dispatchEvent('i18n-changed'), cuando retorna el DOM ya está actualizado.
    if (langBtn) {
      langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const current = getLanguage();
        const next = current === 'es' ? 'en' : 'es';
        configStore.update(c => ({ ...c, lang: next }));
        staggerI18nTexts();
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
          moneda: j.moneda ?? '',
          salarioEsRango: j.salarioEsRango === undefined ? true : Boolean(j.salarioEsRango),
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

  const LEGACY_REF_STATE_MAP = {
    'Me va a referir': 'Contactado',
  };

  function migrateRefState(estado) {
    return LEGACY_REF_STATE_MAP[estado] || estado;
  }

  const refsStore = new Store(STORAGE_KEYS.REFS, [], {
    version: STORAGE_VERSION,
    migrate: (data) => {
      if (Array.isArray(data)) {
        return data.map(r => {
          const normalizedEstado = migrateRefState(r.estado || 'Pendiente');

          const history = Array.isArray(r.history) && r.history.length
            ? r.history.map(entry => ({
                ...entry,
                estado: migrateRefState(entry.estado),
              }))
            : [{
                estado: normalizedEstado,
                fecha: r.createdAt || new Date().toISOString(),
              }];

          return {
            ...r,
            estado: normalizedEstado,
            link: r.link ?? r.linkedin ?? '',
            empresasVinculadas: ensureArray(r.empresasVinculadas),
            volvioAtras: Boolean(r.volvioAtras),
            history,
          };
        });
      }
      return data;
    },
  });

  const configStore = new Store(STORAGE_KEYS.CONFIG, getDefaultConfig(), {
    version: CONFIG_VERSION,
    seed: () => getDefaultConfig(),
  });

  // ----------------------------------------------------------
  // i18n
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
      document.dispatchEvent(new CustomEvent('i18n-changed'));
    }
  });

  // ----------------------------------------------------------
  // UI wiring
  // ----------------------------------------------------------
  const fechaPicker = new DatePicker(document.getElementById('fechaPicker'), {
    onChange: () => {},
  });

  const refRelacionChips = mountChips(document.getElementById('refRelacionChips'));
  const refEstadoChips = mountChips(document.getElementById('refEstadoChips'));

  mountInputLimits(document);

  const createPuestoCtrl = mountCreatePuestoController(configStore);

  mountConfigController(configStore, jobsStore, refsStore);
  const modals = mountModalsController(jobsStore, refsStore, configStore, createPuestoCtrl);
  const jobsCtrl = mountJobsController(
    jobsStore, refsStore, modals, fechaPicker, configStore, createPuestoCtrl
  );
  const refsCtrl = mountRefsController(jobsStore, refsStore, modals, configStore);

  refsCtrl.initChips(refRelacionChips, refEstadoChips);

  mountTheme();
  mountUserMenu(configStore);

  startSessionHeartbeat(() => {
    window.location.replace('./login.html');
  });

  window.addEventListener('pagehide', () => {
    try { sessionStorage.removeItem('jobTrackerFreshLogin'); } catch {}
  });

  // Listener final: solo re-renders. El stagger lo maneja langToggle.
  document.addEventListener('i18n-changed', () => {
    if (jobsCtrl?.renderList) jobsCtrl.renderList();
    if (refsCtrl?.renderRefs) refsCtrl.renderRefs();
  });
}