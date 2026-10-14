// ============================================================
// Entry point for the login screen (mocked single-user auth).
// ============================================================

import { applyI18n, setLanguage, t } from '../i18n/index.js';
import {
  LOGO_OPTIONS, DEFAULT_LOGO, DEFAULT_LANG, STORAGE_KEYS,
  DEFAULT_BACKGROUND, applyBackground,
} from '../app/constants.js';
import {
  login, redirectIfAuthenticated, validateCredentials,
  getLockoutRemainingMs,
} from './session.js';
import { mountInputLimits } from '../ui/form/inputLimits.js';
import { onI18nChanged } from '../app/events.js';

// ------------------------------------------------------------
// Persisted config reader (logo, language, background)
// ------------------------------------------------------------
function readConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Support both wrapped ({ version, data }) and flat shapes.
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

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.authTab));
  });

  return switchTab;
}

// ------------------------------------------------------------
// Password visibility toggles
// ------------------------------------------------------------
/**
 * Sets the toggle button's aria-label and title to match the
 * current state of the associated password field.
 *
 * @param {HTMLButtonElement} btn
 * @param {boolean} isHidden  true if the password is currently masked
 */
function updatePwToggleLabel(btn, isHidden) {
  const key = isHidden ? 'auth.showPassword' : 'auth.hidePassword';
  const label = t(key);
  btn.setAttribute('aria-label', label);
  btn.title = label;
}

function mountPasswordToggles() {
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    // Initial state: the input starts as type="password", so the field
    // is hidden and the button should say "Show password".
    updatePwToggleLabel(btn, true);

    btn.addEventListener('click', () => {
      const wrap = btn.closest('.pw-input-wrap') || btn.parentElement;
      const input = wrap ? wrap.querySelector('input') : null;
      if (!input) return;

      const wasHidden = input.type === 'password';
      input.type = wasHidden ? 'text' : 'password';

      // Swap the icon in the <use> element. The button shows the icon
      // that represents the NEXT action:
      //   - currently hidden  → show "eye"      (click to reveal)
      //   - currently visible → show "eye-off"  (click to hide)
      const use = btn.querySelector('use');
      if (use) {
        const iconId = wasHidden ? 'icon-eye-off' : 'icon-eye';
        use.setAttribute('href', `./assets/icons.svg#${iconId}`);
      }

      updatePwToggleLabel(btn, !wasHidden);
    });
  });

  // Defensive: if the language changes at runtime (e.g. a future
  // language picker on the login screen), the toggle labels need to
  // be re-translated. The login screen has no language switcher today,
  // so this listener is currently inert — but it's cheap insurance
  // and matches how jobsController/refsController handle the event.
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
    } catch (err) {
      console.error('[Login] submit failed', err);
      showError(loginForm, 'Unexpected error. Check the console.');
    }
  });

  // The register tab is disabled in the HTML, so this form can never
  // be shown. Keep the submit handler as a safety net in case the tab
  // is re-enabled in the future.
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearError(registerForm);
      showError(registerForm, t('auth.error.registerDisabled'));
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
      console.info(`[Auth] "${provider}" sign-in is not implemented yet`);
    });
  });
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