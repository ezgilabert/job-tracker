// ============================================================
// Boot: user menu (header dropdown).
// Handles account display, theme/config shortcuts, login, logout,
// the ES/EN toggle, and the print action.
// ============================================================

import { getSession, logout } from '../auth/session.js';
import { getLanguage } from '../i18n.js';

/**
 * Wires up the header user menu.
 *
 * @param {import('../store.js').Store} configStore  used by the
 *        language toggle (language change goes through config).
 */
export function mountUserMenu(configStore) {
  const menu = document.getElementById('userMenu');
  const btn = document.getElementById('userBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginBtn = document.getElementById('loginBtn');
  const configBtn = document.getElementById('configBtn');
  const printBtn = document.getElementById('printBtn');
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

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      menu.classList.remove('open');
      // Close any open modal (edit, history, etc.) so the print
      // output shows only the two lists.
      document.querySelectorAll('.modal-overlay.open').forEach(el => {
        el.classList.remove('open');
      });
      // Give the DOM a tick to repaint before opening the print dialog.
      setTimeout(() => window.print(), 100);
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
    // triggered by the config subscriber when it detects a lang
    // change, so we only need to update the store here.
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = getLanguage();
      const next = current === 'es' ? 'en' : 'es';
      configStore.update(c => ({ ...c, lang: next }));
    });
  }

  document.addEventListener('i18n-changed', refresh);
}