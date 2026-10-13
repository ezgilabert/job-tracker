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
import { mountCreateRoleController } from './controllers/createRoleController.js';
import { DatePicker } from './ui/datePicker.js';
import { mountChips } from './ui/chips.js';
import { mountInputLimits } from './ui/inputLimits.js';
import { ensureArray } from './utils.js';
import { applyI18n, setLanguage, getLanguage } from './i18n.js';
import {
  logout, getSession, requireSession, startSessionHeartbeat,
} from './auth/session.js';

// ============================================================
// Migration tables: old (Spanish) → new (English)
//
// These exist ONLY so a user who already had the app installed
// with the previous Spanish-keyed schema does not lose data.
// New installs never touch these tables.
// ============================================================

const JOB_STATUS_MAP = {
  'Guardado':               'Saved',
  'Aplicado':               'Applied',
  'Contacto':               'Contact',
  'Entrevista RRHH':        'HR Interview',
  'Challenge técnico':      'Technical Challenge',
  'Live coding':            'Live Coding',
  'Entrevista Técnica':     'Technical Interview',
  'Entrevista con cliente': 'Client Interview',
  'Charla con cliente':     'Client Chat',
  'Entrevista Final':       'Final Interview',
  'Referencias':            'References',
  'Negociación':            'Negotiation',
  'Oferta':                 'Offer',
  'Rechazado':              'Rejected',
  'Ghosted':                'Ghosted',
  'Descartado':             'Discarded',
};

const REF_STATUS_MAP = {
  'Pendiente':       'Pending',
  'Contactado':      'Contacted',
  'Referido hecho':  'Referred',
  'En proceso':      'In Process',
  'Contratado':      'Hired',
  'No aplica':       'Not Applicable',
  // Legacy state that existed even before the previous rename.
  'Me va a referir': 'Contacted',
};

const RELATIONSHIP_MAP = {
  'Amigo':     'Friend',
  'Ex-colega': 'Ex-colleague',
  'Familiar':  'Family',
  'Conocido':  'Acquaintance',
  'Recruiter': 'Recruiter',
  'Mentor':    'Mentor',
};

const CONTACT_PLATFORM_MAP = {
  'linkedin': 'linkedin',
  'email':    'email',
  'whatsapp': 'whatsapp',
  'otro':     'other',
  'other':    'other',
};

const WORK_MODE_MAP = {
  'presencial': 'onsite',
  'home':       'remote',
  'hybrid':     'hybrid',
  'onsite':     'onsite',
  'remote':     'remote',
  '':           '',
};

function mapJobStatus(s) {
  if (!s) return 'Saved';
  return JOB_STATUS_MAP[s] || s;
}

function mapRefStatus(s) {
  if (!s) return 'Pending';
  return REF_STATUS_MAP[s] || s;
}

function mapRelationship(r) {
  if (!r) return r;
  return RELATIONSHIP_MAP[r] || r;
}

function mapContactPlatform(p) {
  if (!p) return 'other';
  return CONTACT_PLATFORM_MAP[p] || p;
}

function mapWorkMode(m) {
  if (m === undefined || m === null) return '';
  return WORK_MODE_MAP[m] ?? m;
}

// ------------------------------------------------------------
// Job migration: Spanish keys → English keys
// ------------------------------------------------------------
function migrateJob(j) {
  if (!j || typeof j !== 'object') return j;

  const hourlyRaw   = j.hourlySalary   ?? j.salarioPorHora;
  const rangeRaw    = j.salaryIsRange  ?? j.salarioEsRango;
  const wentBackRaw = j.wentBack       ?? j.volvioAtras;

  return {
    id: j.id,
    company:  j.company  ?? j.empresa  ?? '',
    role:     j.role     ?? j.puesto   ?? '',
    date:     j.date     ?? j.fecha    ?? '',
    status:   mapJobStatus(j.status ?? j.estado),
    link:     j.link ?? '',
    salary:   j.salary   ?? j.salario  ?? '',
    hourlySalary:  Boolean(hourlyRaw),
    salaryIsRange: rangeRaw === undefined ? true : Boolean(rangeRaw),
    currency: j.currency ?? j.moneda ?? 'usd',
    workMode: mapWorkMode(j.workMode ?? j.modalidad),
    hybridOfficeDays: j.hybridOfficeDays ?? null,
    contact:  j.contact   ?? j.contacto       ?? '',
    contactLink:     j.contactLink     ?? j.contactoLink     ?? '',
    contactPlatform: mapContactPlatform(j.contactPlatform ?? j.contactoTipo),
    notes:    j.notes ?? j.notas ?? '',
    skipped: ensureArray(j.skipped).map(mapJobStatus),
    wentBack: Boolean(wentBackRaw),
    offerConfirmed: Boolean(j.offerConfirmed),
    history: ensureArray(j.history).map(h => ({
      status:   mapJobStatus(h.status ?? h.estado),
      date:     h.date ?? h.fecha,
      reason:   h.reason ?? h.motivo,
      note:     h.note   ?? h.nota,
      wentBack: Boolean(h.wentBack ?? h.retroceso),
    })),
  };
}

// ------------------------------------------------------------
// Referral migration: Spanish keys → English keys
// ------------------------------------------------------------
function migrateRef(r) {
  if (!r || typeof r !== 'object') return r;

  const rawRelationship = r.relationship ?? r.relacion;
  const relationship = Array.isArray(rawRelationship)
    ? rawRelationship.map(mapRelationship)
    : (rawRelationship ? [mapRelationship(rawRelationship)] : []);

  const wentBackRaw = r.wentBack ?? r.volvioAtras;

  return {
    id: r.id,
    name:     r.name  ?? r.nombre  ?? '',
    role:     r.role  ?? r.rol     ?? '',
    contact:  r.contact ?? r.contacto ?? '',
    link:     r.link  ?? r.linkedin ?? '',
    relationship,
    status:   mapRefStatus(r.status ?? r.estado),
    linkedCompanies: ensureArray(r.linkedCompanies ?? r.empresasVinculadas),
    linkedJobId: r.linkedJobId ?? null,
    notes:    r.notes ?? r.notas ?? '',
    wentBack: Boolean(wentBackRaw),
    createdAt: r.createdAt || new Date().toISOString(),
    history: ensureArray(r.history).map(h => ({
      status:   mapRefStatus(h.status ?? h.estado),
      date:     h.date ?? h.fecha,
      reason:   h.reason ?? h.motivo,
      note:     h.note   ?? h.nota,
      wentBack: Boolean(h.wentBack ?? h.retroceso),
    })),
  };
}

// ------------------------------------------------------------
// Config migration: Spanish keys → English keys
// ------------------------------------------------------------
function migrateConfig(data) {
  if (!data || typeof data !== 'object') return getDefaultConfig();

  const defaults = getDefaultConfig();
  const out = { ...defaults, ...data };

  // ---- Profile ----
  const oldProfile = data.profile || {};
  out.profile = {
    ...defaults.profile,
    firstName: oldProfile.firstName ?? oldProfile.nombre ?? '',
    lastName:  oldProfile.lastName  ?? oldProfile.apellido ?? '',
    username:  oldProfile.username  ?? '',
    email:     oldProfile.email     ?? '',
    bio:       oldProfile.bio       ?? '',
    avatar:    oldProfile.avatar    ?? '',
  };

  // ---- Roles ----
  const oldRoles = data.roles || data.puestos || {};
  out.roles = {
    activeTags: oldRoles.activeTags || ROLE_TAGS_DEFAULT_IDS(),
    hidden:     oldRoles.hidden     || [],
    custom:     oldRoles.custom     || [],
    customTags: oldRoles.customTags || {},
  };
  delete out.puestos;

  // ---- Initial statuses ----
  const oldStatuses = data.initialStatuses ?? data.estadosIniciales;
  if (Array.isArray(oldStatuses)) {
    out.initialStatuses = oldStatuses.map(mapJobStatus);
  }
  delete out.estadosIniciales;

  const oldDefault = data.defaultInitialStatus ?? data.estadoInicialDefault;
  if (oldDefault) {
    out.defaultInitialStatus = mapJobStatus(oldDefault);
  }
  delete out.estadoInicialDefault;

  // ---- Filters ----
  const oldFilters = data.filters ?? data.filtros;
  if (Array.isArray(oldFilters)) {
    out.filters = oldFilters.map(f => ({
      id: mapFilterId(f.id),
      visible: f.visible !== false,
    }));
  }
  delete out.filtros;

  // ---- Dashboard styles (legacy single field) ----
  if (data.dashboardStyle && !data.dashboardStyleJobs && !data.dashboardStyleRefs) {
    out.dashboardStyleJobs = data.dashboardStyle;
    out.dashboardStyleRefs = data.dashboardStyle;
  }
  if (!out.dashboardStyleJobs) out.dashboardStyleJobs = DEFAULT_DASHBOARD_STYLE;
  if (!out.dashboardStyleRefs) out.dashboardStyleRefs = DEFAULT_DASHBOARD_STYLE;
  delete out.dashboardStyle;

  return out;
}

function ROLE_TAGS_DEFAULT_IDS() {
  // Referenced lazily to avoid a circular import at module load.
  return [
    'programmer', 'frontend', 'backend', 'fullstack', 'mobile', 'qa',
    'devops', 'data', 'security', 'leadership', 'gamedev',
  ];
}

const FILTER_ID_MAP = {
  'all':                'all',
  'active':             'active',
  'closed':             'closed',
  'Guardado':           'Saved',
  'Aplicado':           'Applied',
  'Contacto':           'Contact',
  'Entrevista RRHH':    'HR Interview',
  'Challenge técnico':  'Technical Challenge',
  'Live coding':        'Live Coding',
  'Entrevista Técnica': 'Technical Interview',
  'Entrevista con cliente': 'Client Interview',
  'Charla con cliente':     'Client Chat',
  'Entrevista Final':       'Final Interview',
  'Referencias':        'References',
  'Negociación':        'Negotiation',
  'Oferta':             'Offer',
  'Rechazado':          'Rejected',
  'Ghosted':            'Ghosted',
  'Descartado':         'Discarded',
};

function mapFilterId(id) {
  return FILTER_ID_MAP[id] || id;
}

// ============================================================
// Boot
// ============================================================
boot();

async function boot() {
  if (!(await requireSession('./login.html'))) return;

  // ----------------------------------------------------------
  // Cascade pulse on language change (Web Animations API)
  //   - New text is applied BEFORE animating (no flash).
  //   - Each element slides up 24px with a fade.
  //   - 60ms stagger between elements, ordered by visual position.
  //   - 550ms per element, capped at 450ms of accumulated delay.
  //   - Respects prefers-reduced-motion.
  //   - Cancels any running animation on the same element first.
  // ----------------------------------------------------------
  function pulseI18nTexts() {
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Only animate visible text; skip placeholders and titles so
    // we don't disturb a focused input.
    const all = document.querySelectorAll(
      '.container [data-i18n], .container [data-i18n-html]'
    );

    const visible = [];
    all.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) visible.push(el);
    });

    if (!visible.length) return;

    // Sort by visual position; 8px tolerance groups elements on
    // the same row.
    visible.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > 8) return ra.top - rb.top;
      return ra.left - rb.left;
    });

    const STAGGER = 60;
    const MAX_STAGGER = 450;
    const DURATION = 550;

    visible.forEach((el, i) => {
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
  // Theme ripple (radial wipe) at click point
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
      // Language change goes through the config store. The pulse is
      // triggered by the store subscriber when it detects a lang change.
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
      if (Array.isArray(data)) return data.map(migrateJob);
      return data;
    },
  });

  const refsStore = new Store(STORAGE_KEYS.REFS, [], {
    version: STORAGE_VERSION,
    migrate: (data) => {
      if (Array.isArray(data)) return data.map(migrateRef);
      return data;
    },
  });

  const configStore = new Store(STORAGE_KEYS.CONFIG, getDefaultConfig(), {
    version: CONFIG_VERSION,
    seed: () => getDefaultConfig(),
    migrate: migrateConfig,
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

      // Single trigger for the pulse — works for both the menu
      // button and the config panel.
      pulseI18nTexts();

      document.dispatchEvent(new CustomEvent('i18n-changed'));
    }
  });

  // ----------------------------------------------------------
  // UI wiring
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

  const createRoleCtrl = mountCreateRoleController(configStore);

  mountConfigController(configStore, jobsStore, refsStore);
  const modals = mountModalsController(jobsStore, refsStore, configStore, createRoleCtrl);
  const jobsCtrl = mountJobsController(
    jobsStore, refsStore, modals, datePicker, configStore, createRoleCtrl
  );
  const refsCtrl = mountRefsController(jobsStore, refsStore, modals, configStore);

  refsCtrl.initChips(refRelationshipChips, refStatusChips);

  mountTheme();
  mountUserMenu(configStore);

  startSessionHeartbeat(() => {
    window.location.replace('./login.html');
  });

  // Re-render lists on language change.
  document.addEventListener('i18n-changed', () => {
    if (jobsCtrl?.renderList) jobsCtrl.renderList();
    if (refsCtrl?.renderRefs) refsCtrl.renderRefs();
  });
}