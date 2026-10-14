// ============================================================
// Boot: first-run welcome banner.
//
// Shown once, before the user dismisses it. Teaches the keyboard
// shortcuts, drag-to-reorder and where Settings lives. The
// dismissal flag is stored in localStorage so the banner never
// comes back on a returning visit.
//
// The banner is generated dynamically and inserted above the
// jobs dashboard. It listens for i18n changes so its labels stay
// in sync when the user switches language.
// ============================================================

import { onI18nChanged } from '../app/events.js';
import { icon } from '../templates/icon.js';

const STORAGE_KEY = 'jobTrackerWelcomeDismissed';

function isDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
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
 */
export function mountFirstRun(jobsStore, refsStore) {
  if (isDismissed()) return;

  const banner = document.createElement('div');
  banner.className = 'welcome-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Welcome');

  // Pull the current translator lazily so the module does not need
  // to import from i18n at the top level.
  let tFn = (k) => k;

  const render = () => {
    banner.innerHTML = buildContent(tFn);
  };

  // Insert above the jobs dashboard, so it appears right after the
  // header and before the user's data.
  const anchor = document.getElementById('jobsDashboard');
  const container = document.querySelector('.container');

  if (anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(banner, anchor);
  } else if (container) {
    container.appendChild(banner);
  } else {
    return;
  }

  // Event delegation — survives innerHTML re-renders.
  banner.addEventListener('click', (e) => {
    if (e.target.closest('[data-dismiss]')) {
      markDismissed();
      banner.classList.add('leaving');
      setTimeout(() => banner.remove(), 260);
    }
  });

  // Load the translator and render. This is deferred so the rest of
  // boot is not blocked on an extra dynamic import.
  import('../i18n/index.js').then(({ t }) => {
    tFn = t;
    render();

    onI18nChanged(() => {
      // Only re-render if the banner is still attached.
      if (document.body.contains(banner)) render();
    });
  }).catch((err) => {
    console.warn('[FirstRun] could not load i18n', err);
  });
}