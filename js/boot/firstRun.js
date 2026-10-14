// ============================================================
// Boot: first-run welcome banner.
//
// Shown once per user, before they dismiss it. Teaches the
// keyboard shortcuts, drag-to-reorder and where Settings lives.
// The dismissal flag is stored under a per-user key so each
// account sees the banner on their own first visit.
// ============================================================

import { onI18nChanged } from '../app/events.js';
import { icon } from '../templates/icon.js';
import { STORAGE_KEYS } from '../app/constants.js';

function isDismissed(userId) {
  try {
    return localStorage.getItem(STORAGE_KEYS.WELCOME(userId)) === 'true';
  } catch {
    return false;
  }
}

function markDismissed(userId) {
  try {
    localStorage.setItem(STORAGE_KEYS.WELCOME(userId), 'true');
  } catch {
    /* localStorage unavailable — the banner will just show again */
  }
}

function buildContent(t) {
  return `
    <div class="welcome-icon" aria-hidden="true">${icon('icon-sparkle')}</div>
    <div class="welcome-body">
      <h3>${t('welcome.title')}</h3>
      <p class="welcome-subtitle">${t('welcome.subtitle')}</p>
      <ul class="welcome-tips">
        <li>
          <span class="welcome-tip-icon">${icon('icon-sparkle')}</span>
          <span>${t('welcome.tip.new')}</span>
        </li>
        <li>
          <span class="welcome-tip-icon">${icon('icon-search')}</span>
          <span>${t('welcome.tip.search')}</span>
        </li>
        <li>
          <span class="welcome-tip-icon">${icon('icon-grip-vertical')}</span>
          <span>${t('welcome.tip.drag')}</span>
        </li>
        <li>
          <span class="welcome-tip-icon">${icon('icon-settings')}</span>
          <span>${t('welcome.tip.settings')}</span>
        </li>
      </ul>
    </div>
    <button type="button" class="welcome-dismiss" data-dismiss>
      ${t('welcome.dismiss')}
    </button>
  `;
}

/**
 * @param {import('../app/store.js').Store} jobsStore
 * @param {import('../app/store.js').Store} refsStore
 * @param {string} userId
 */
export function mountFirstRun(jobsStore, refsStore, userId) {
  if (!userId) return;
  if (isDismissed(userId)) return;

  const banner = document.createElement('div');
  banner.className = 'welcome-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Welcome');

  let tFn = (k) => k;

  const render = () => {
    banner.innerHTML = buildContent(tFn);
  };

  const anchor = document.getElementById('jobsDashboard');
  const container = document.querySelector('.container');

  if (anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(banner, anchor);
  } else if (container) {
    container.appendChild(banner);
  } else {
    return;
  }

  banner.addEventListener('click', (e) => {
    if (e.target.closest('[data-dismiss]')) {
      markDismissed(userId);
      banner.classList.add('leaving');
      setTimeout(() => banner.remove(), 260);
    }
  });

  import('../i18n/index.js').then(({ t }) => {
    tFn = t;
    render();

    onI18nChanged(() => {
      if (document.body.contains(banner)) render();
    });
  }).catch((err) => {
    console.warn('[FirstRun] could not load i18n', err);
  });
}