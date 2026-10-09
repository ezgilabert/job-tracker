// ============================================================
// Entry point for the login screen (mocked single-user auth)
// ============================================================

import { applyI18n, setLanguage, t } from '../i18n.js';
import {
  LOGO_OPTIONS, DEFAULT_LOGO, DEFAULT_LANG, STORAGE_KEYS,
  DEFAULT_BACKGROUND, applyBackground,
} from '../constants.js';
import {
  login, redirectIfAuthenticated, validateCredentials,
} from './session.js';
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

  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
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
// Inline error box helpers
// ------------------------------------------------------------
function showError(form, message) {
  let box = form.querySelector('.auth-error');
  if (!box) {
    box = document.createElement('div');
    box.className = 'auth-error';
    box.setAttribute('role', 'alert');
    const submit = form.querySelector('button[type="submit"]');
    if (submit) form.insertBefore(box, submit);
    else form.appendChild(box);
  }
  box.textContent = message;
}

function clearError(form) {
  const box = form.querySelector('.auth-error');
  if (box) box.remove();
}

// ------------------------------------------------------------
// Forms: validate against the mocked credentials, then create
// a local session and hand off to the app.
// ------------------------------------------------------------
function mountForms() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError(loginForm);

    const identifier = document.getElementById('loginEmail').value.trim();
    const password   = document.getElementById('loginPassword').value;
    const remember   = document.getElementById('loginRemember').checked;

    const user = validateCredentials(identifier, password);
    if (!user) {
      showError(loginForm, t('auth.error.invalid'));
      const pwInput = document.getElementById('loginPassword');
      if (pwInput) {
        pwInput.value = '';
        pwInput.focus();
      }
      return;
    }

    login({
      username: user.username,
      email: user.email,
      name: user.name,
      remember,
    });
    window.location.href = './index.html';
  });

  // Registration is disabled in the mocked build.
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError(registerForm);
    showError(registerForm, t('auth.error.registerDisabled'));
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
  mountSocials();

  mountInputLimits(document);
}

boot();