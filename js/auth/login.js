// ============================================================
// Entry point for the login screen (mocked local auth).
// ============================================================

import { applyI18n, setLanguage, t } from '../i18n/index.js';
import {
  LOGO_OPTIONS, DEFAULT_LOGO, DEFAULT_LANG, STORAGE_KEYS,
  DEFAULT_BACKGROUND, applyBackground,
} from '../app/constants.js';
import {
  login, redirectIfAuthenticated, validateCredentials,
  getLockoutRemainingMs, registerUser, getActiveUserId,
} from './session.js';
import {
  hasAnyUser,
  validateRegistration,
} from './users.js';
import { mountInputLimits } from '../ui/form/inputLimits.js';
import { onI18nChanged } from '../app/events.js';
import { showToast } from '../ui/feedback/toast.js';

// ------------------------------------------------------------
// Persisted config reader
// ------------------------------------------------------------
// Reads the config of the last logged-in user (from
// `jobTrackerActiveUser`) so we can apply their logo/background
// before any session exists. Falls back to `{}` when nobody has
// ever signed in on this browser profile.
// ------------------------------------------------------------
function readConfig() {
  try {
    const userId = getActiveUserId();
    if (!userId) return {};
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG(userId));
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
// Theme
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
      loginForm.classList.remove('is-hidden');
      registerForm.classList.add('is-hidden');
    } else {
      loginForm.classList.add('is-hidden');
      registerForm.classList.remove('is-hidden');
    }
  }

  // On a fresh install there are no accounts yet. Open on the
  // register tab and disable the login tab, which would be
  // unusable anyway.
  const firstRun = !hasAnyUser();
  if (firstRun) {
    const loginTab = document.querySelector('[data-auth-tab="login"]');
    if (loginTab) loginTab.disabled = true;
    switchTab('register');
  } else {
    switchTab('login');
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.authTab));
  });

  return switchTab;
}

// ------------------------------------------------------------
// Password visibility toggles
// ------------------------------------------------------------
function updatePwToggleLabel(btn, isHidden) {
  const key = isHidden ? 'auth.showPassword' : 'auth.hidePassword';
  const label = t(key);
  btn.setAttribute('aria-label', label);
  btn.title = label;
}

function mountPasswordToggles() {
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    updatePwToggleLabel(btn, true);

    btn.addEventListener('click', () => {
      const wrap = btn.closest('.pw-input-wrap') || btn.parentElement;
      const input = wrap ? wrap.querySelector('input') : null;
      if (!input) return;

      const wasHidden = input.type === 'password';
      input.type = wasHidden ? 'text' : 'password';

      const use = btn.querySelector('use');
      if (use) {
        const iconId = wasHidden ? 'icon-eye-off' : 'icon-eye';
        use.setAttribute('href', `./assets/icons.svg#${iconId}`);
      }

      updatePwToggleLabel(btn, !wasHidden);
    });
  });

  onI18nChanged(() => {
    document.querySelectorAll('.pw-toggle').forEach(btn => {
      const wrap = btn.closest('.pw-input-wrap') || btn.parentElement;
      const input = wrap ? wrap.querySelector('input') : null;
      if (!input) return;
      updatePwToggleLabel(btn, input.type === 'password');
    });
  });
}

// ------------------------------------------------------------
// Error helpers
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
// Register error routing
// ------------------------------------------------------------
const REGISTER_FIELD_MAP = {
  username:        'registerUsername',
  email:           'registerEmail',
  password:        'registerPassword',
  confirmPassword: 'registerPasswordConfirm',
};

function showRegisterErrors(form, errors) {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;
  showError(form, t(errors[firstKey]));
  const inputId = REGISTER_FIELD_MAP[firstKey];
  const input = inputId ? document.getElementById(inputId) : null;
  if (input) input.focus();
}

// ------------------------------------------------------------
// Forms
// ------------------------------------------------------------
function mountForms() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (!loginForm) {
    console.error('[Login] #loginForm not found in DOM');
    return;
  }

  // If a lockout is already active on page load, surface it.
  if (getLockoutRemainingMs() > 0) {
    const mins = Math.ceil(getLockoutRemainingMs() / 60000);
    setLoginDisabled(true, t('auth.error.locked', { min: mins }));
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(loginForm);

    try {
      const identifier = document.getElementById('loginEmail').value.trim();
      const password   = document.getElementById('loginPassword').value;

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
        userId: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
      });
      window.location.href = './index.html';
    } catch (err) {
      console.error('[Login] submit failed', err);
      showError(loginForm, t('auth.error.unexpected'));
    }
  });

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError(registerForm);

      const username = (document.getElementById('registerUsername')?.value || '').trim();
      const email    = (document.getElementById('registerEmail')?.value || '').trim();
      const name     = (document.getElementById('registerName')?.value || '').trim();
      const password = document.getElementById('registerPassword')?.value || '';
      const confirmPassword = document.getElementById('registerPasswordConfirm')?.value || '';

      const { valid, errors } = validateRegistration({
        username, email, password, confirmPassword,
      });
      if (!valid) {
        showRegisterErrors(registerForm, errors);
        return;
      }

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = t('auth.register.creating');
      }

      try {
        await registerUser({ username, email, name, password });
        window.location.href = './index.html';
      } catch (err) {
        console.error('[Register] failed', err);
        showError(registerForm, t('auth.error.register.failed'));
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }
}

// ------------------------------------------------------------
// Social sign-in stubs
// ------------------------------------------------------------
function mountSocials() {
  document.querySelectorAll('.btn-social').forEach(btn => {
    btn.addEventListener('click', () => {
      const provider = btn.dataset.provider || 'social';
      const name = provider.charAt(0).toUpperCase() + provider.slice(1);
      showToast(t('auth.socialStub', { provider: name }), 'icon-lock');
    });
  });

  const forgotBtn = document.getElementById('loginForgot');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showToast(t('auth.forgotNotice'), 'icon-lock', { duration: 4500 });
    });
  }
}

// ------------------------------------------------------------
// Boot
// ------------------------------------------------------------
async function boot() {
  // 1) Visual config first (logo / background / language) — non-critical.
  try {
    const config = readConfig();
    setLanguage(config.lang || DEFAULT_LANG);
    applyI18n(document);
    applyLogo(config.logo || DEFAULT_LOGO);
    applyBackground(config.background || DEFAULT_BACKGROUND);
  } catch (err) {
    console.error('[Login] config boot failed', err);
  }

  // 2) Mount the login UI *before* any redirect so a failing redirect
  //    cannot leave the screen without listeners.
  try {
    mountTheme();
    mountTabs();
    mountPasswordToggles();
    mountForms();
    mountSocials();
    mountInputLimits(document);
  } catch (err) {
    console.error('[Login] UI mount failed', err);
  }

  // 3) If a valid session exists, jump to the app.
  let shouldRedirect = false;
  try {
    shouldRedirect = await redirectIfAuthenticated('./index.html');
  } catch (err) {
    console.error('[Login] redirect check failed', err);
  }
  if (shouldRedirect) return;
}

boot().catch(err => {
  console.error('[Login] boot failed', err);
});