// ============================================================
// Entry point for the login screen (mocked single-user auth)
// ============================================================

import { applyI18n, setLanguage, t } from '../i18n.js';
import {
  LOGO_OPTIONS, DEFAULT_LOGO, DEFAULT_LANG, STORAGE_KEYS,
  DEFAULT_BACKGROUND, applyBackground,
} from '../constants.js';
import {
  logout, login, redirectIfAuthenticated, validateCredentials,
  getLockoutRemainingMs,
} from './session.js';
import { mountInputLimits } from '../ui/inputLimits.js';

// ------------------------------------------------------------
// Read persisted config (logo + language + background)
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

function applyLogo(logoId) {
  const el = document.getElementById('brandLogo');
  if (!el) return;
  const option = LOGO_OPTIONS.find(o => o.id === logoId) || LOGO_OPTIONS[0];
  el.innerHTML = option.svg;
}

// ------------------------------------------------------------
// Tabs
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
// Password toggle
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
// Error / lockout helpers
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

function setLoginDisabled(disabled, reason = '') {
  const form = document.getElementById('loginForm');
  const submit = form?.querySelector('button[type="submit"]');
  const email  = document.getElementById('loginEmail');
  const pass   = document.getElementById('loginPassword');
  [submit, email, pass].forEach(el => { if (el) el.disabled = disabled; });
  if (disabled && reason) showError(form, reason);
}

// ------------------------------------------------------------
// Forms
// ------------------------------------------------------------
function mountForms() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // Estado inicial: si ya está bloqueado, mostrarlo.
  if (getLockoutRemainingMs() > 0) {
    const mins = Math.ceil(getLockoutRemainingMs() / 60000);
    setLoginDisabled(true, t('auth.error.locked', { min: mins }));
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(loginForm);

    const identifier = document.getElementById('loginEmail').value.trim();
    const password   = document.getElementById('loginPassword').value;
    const remember   = document.getElementById('loginRemember').checked;

    const user = await validateCredentials(identifier, password);

    if (user && user.locked) {
      const mins = Math.ceil(getLockoutRemainingMs() / 60000);
      setLoginDisabled(true, t('auth.error.locked', { min: mins }));
      return;
    }

    if (!user) {
      const remaining = getLockoutRemainingMs();
      if (remaining > 0) {
        const mins = Math.ceil(remaining / 60000);
        setLoginDisabled(true, t('auth.error.locked', { min: mins }));
      } else {
        showError(loginForm, t('auth.error.invalid'));
        const pwInput = document.getElementById('loginPassword');
        if (pwInput) { pwInput.value = ''; pwInput.focus(); }
      }
      return;
    }

    await login({
      username: user.username,
      email: user.email,
      name: user.name,
      remember,
    });
    window.location.href = './index.html';
  });

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError(registerForm);
    showError(registerForm, t('auth.error.registerDisabled'));
  });
}

// ------------------------------------------------------------
// Socials (stubs)
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
async function boot() {
  // El login es siempre obligatorio: limpiamos cualquier sesión vieja.
  logout();
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