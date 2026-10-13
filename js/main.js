// ============================================================
// Entry point: wires stores, controllers, and UI
// ============================================================

import { Store } from './store.js';
import {
  STORAGE_KEYS, STORAGE_VERSION, CONFIG_VERSION,
  SAMPLE_JOBS, getDefaultConfig, LOGO_OPTIONS, DEFAULT_LOGO, DEFAULT_LANG,
  BACKGROUND_OPTIONS, DEFAULT_BACKGROUND, applyBackground,
  DEFAULT_DASHBOARD_STYLE,
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
  // Pulse de textos al cambiar idioma (Web Animations API)
  //
  // V3 · Slide cascada
  //   - Texto nuevo aplicado ANTES de animar (no hay flash).
  //   - Cada elemento entra desde 24px abajo con fade.
  //   - Stagger 60ms entre elementos, ordenados por posición
  //     visual (arriba→abajo, izq→der).
  //   - Duración 550ms por elemento. Total: ~1000ms máx.
  //   - Respeta prefers-reduced-motion.
  //   - Cancela animaciones previas si el usuario clickea rápido.
  // ----------------------------------------------------------
  function pulseI18nTexts() {
    // Si el usuario prefiere no animaciones, no hacemos nada.
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Solo animamos texto real. NO placeholders (para no interferir
    // con un input que esté enfocado), NO titles.
    const all = document.querySelectorAll(
      '.container [data-i18n], .container [data-i18n-html]'
    );

    // Filtramos a los que realmente están visibles en pantalla.
    const visible = [];
    all.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) visible.push(el);
    });

    if (!visible.length) return;

    // Ordenamos por posición visual.
    // Tolerancia de 8px para agrupar elementos en la misma fila.
    visible.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > 8) return ra.top - rb.top;
      return ra.left - rb.left;
    });

    const STAGGER = 60;         // ms entre elementos
    const MAX_STAGGER = 450;    // tope del delay acumulado
    const DURATION = 550;       // duración de cada animación

    visible.forEach((el, i) => {
      // Cancelamos cualquier animación previa en el mismo elemento.
      if (typeof el.getAnimations === 'function') {
        el.getAnimations().forEach(a => {
          try { a.cancel(); } catch (_) { /* noop */ }
        });
      }

      const delay = Math.min(i * STAGGER, MAX_STAGGER);

      el.style.willChange = 'opacity, transform';

      const anim = el.animate(
        [
          { opacity: 0, transform: 'translateY(24px)' },
          { opacity: 1, transform: 'translateY(0)'    },
        ],
        {
          duration: DURATION,
          delay,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'none',
        }
      );

      const cleanup = () => { el.style.willChange = ''; };
      anim.onfinish = cleanup;
      anim.oncancel = cleanup;
    });
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

    if (langBtn) {
      // El cambio de idioma va solo por el configStore. El pulse se
      // dispara desde el subscriber cuando detecta el cambio de lang.
      langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const current = getLanguage();
        const next = current === 'es' ? 'en' : 'es';
        configStore.update(c => ({ ...c, lang: next }));
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

          // Normalizar relacion → array (multiselect)
          const relacionRaw = r.relacion;
          const relacion = Array.isArray(relacionRaw)
            ? relacionRaw
            : (relacionRaw ? [relacionRaw] : []);

          return {
            ...r,
            estado: normalizedEstado,
            relacion,
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
    migrate: (data) => {
      if (!data || typeof data !== 'object') return getDefaultConfig();

      const defaults = getDefaultConfig();
      const out = { ...defaults, ...data };
      out.profile = { ...defaults.profile, ...(data.profile || {}) };

      // Migración: si venía del modelo viejo (una sola key `dashboardStyle`),
      // la usamos como base para ambos.
      if (data.dashboardStyle && !data.dashboardStyleJobs && !data.dashboardStyleRefs) {
        out.dashboardStyleJobs = data.dashboardStyle;
        out.dashboardStyleRefs = data.dashboardStyle;
      }
      if (!out.dashboardStyleJobs) out.dashboardStyleJobs = DEFAULT_DASHBOARD_STYLE;
      if (!out.dashboardStyleRefs) out.dashboardStyleRefs = DEFAULT_DASHBOARD_STYLE;

      delete out.dashboardStyle;

      return out;
    },
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

      // Un único lugar dispara el pulse, tanto si el cambio viene
      // del botón del menú como de la configuración.
      pulseI18nTexts();

      document.dispatchEvent(new CustomEvent('i18n-changed'));
    }
  });

  // ----------------------------------------------------------
  // UI wiring
  // ----------------------------------------------------------
  const fechaPicker = new DatePicker(document.getElementById('fechaPicker'), {
    onChange: () => {},
  });

  const refRelacionChips = mountChips(
    document.getElementById('refRelacionChips'),
    { allowMultiple: true }
  );
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

  // Re-render de listas cuando cambia el idioma.
  document.addEventListener('i18n-changed', () => {
    if (jobsCtrl?.renderList) jobsCtrl.renderList();
    if (refsCtrl?.renderRefs) refsCtrl.renderRefs();
  });
}