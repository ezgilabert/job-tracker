// ============================================================
// Entry point for the login / register screen (Option 1 layout)
// ============================================================

import { applyI18n, setLanguage } from '../i18n.js';
import {
  LOGO_OPTIONS, DEFAULT_LOGO, DEFAULT_LANG, STORAGE_KEYS,
  DEFAULT_BACKGROUND, applyBackground,
} from '../constants.js';
import { login, redirectIfAuthenticated } from './session.js';
import { mountInputLimits } from '../ui/inputLimits.js';

// ------------------------------------------------------------
// Read persisted config (logo + language + background)
// without side effects
// ------------------------------------------------------------
function readConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && 'data' in parsed
      ? parsed.data
      : parsed;
  } catch {
    return {};
  }
}

// ------------------------------------------------------------
// Theme toggle
// ------------------------------------------------------------
function mountTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEYS.THEME, next);
  });
}

// ------------------------------------------------------------
// Render the app logo (same source as the main app)
// ------------------------------------------------------------
function applyLogo(logoId) {
  const el = document.getElementById('brandLogo');
  if (!el) return;
  const option = LOGO_OPTIONS.find(o => o.id === logoId) || LOGO_OPTIONS[0];
  el.innerHTML = option.svg;
}

// ------------------------------------------------------------
// Tabs: switch between sign-in and sign-up forms
// ------------------------------------------------------------
function mountTabs() {
  const tabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  function switchTab(target) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.authTab === target));

    if (target === 'login') {
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    } else {
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.authTab));
  });

  return switchTab;
}

// ------------------------------------------------------------
// Show / hide password toggle
// ------------------------------------------------------------
function mountPasswordToggles() {
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.style.color = isPassword ? 'var(--accent)' : '';
    });
  });
}

// ------------------------------------------------------------
// Forms: create a local session and hand off to the app.
// NOTE: no credential validation yet — backend will handle it.
// ------------------------------------------------------------
function mountForms() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const remember = document.getElementById('loginRemember').checked;
    login({ email, remember });
    window.location.href = './index.html';
  });

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    login({ email, name, remember: true });
    window.location.href = './index.html';
  });
}

// ------------------------------------------------------------
// Guest: continue without an account.
// Creates a session with guest:true — same guards, no credentials.
// ------------------------------------------------------------
function mountGuest() {
  const btn = document.getElementById('guestBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    login({ name: 'Guest', guest: true, remember: true });
    window.location.href = './index.html';
  });
}

// ------------------------------------------------------------
// Social providers: UI stubs for now
// ------------------------------------------------------------
function mountSocials() {
  document.querySelectorAll('.btn-social').forEach(btn => {
    btn.addEventListener('click', () => {
      const provider = btn.dataset.provider || 'social';
      console.info(`[Auth] "${provider}" sign-in is not implemented yet`);
    });
  });
}

// ------------------------------------------------------------
// Boot
// ------------------------------------------------------------
function boot() {
  // Already signed in → skip the login screen entirely
  if (redirectIfAuthenticated('./index.html')) return;

  const config = readConfig();
  setLanguage(config.lang || DEFAULT_LANG);
  applyI18n(document);
  applyLogo(config.logo || DEFAULT_LOGO);
  applyBackground(config.background || DEFAULT_BACKGROUND);

  mountTheme();
  mountTabs();
  mountPasswordToggles();
  mountForms();
  mountGuest();
  mountSocials();

  // Límites en los campos del login / registro
  mountInputLimits(document);
}

boot();