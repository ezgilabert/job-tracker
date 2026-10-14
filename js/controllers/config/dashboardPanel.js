// ============================================================
// Config panel: Dashboard
//
// Two independent pickers: one for jobs, one for referrals.
// ============================================================

import {
  DASHBOARD_STYLES, DASHBOARD_STYLE_META, DEFAULT_DASHBOARD_STYLE,
} from '../../app/constants.js';
import { escapeHtml } from '../../app/utils.js';
import { t } from '../../i18n/index.js';

const NEW_STYLES = ['minimal', 'compact', 'circular', 'heatmap'];

export function mountDashboardPanel(host) {
  const jobsEl = document.getElementById('configDashJobs');
  const refsEl = document.getElementById('configDashRefs');

  function renderGrid(container, field, current) {
    container.innerHTML = DASHBOARD_STYLE_META.map(opt => {
      const isSelected = opt.id === current;
      const badge = NEW_STYLES.includes(opt.id)
        ? `<span class="config-dash-badge-new">${escapeHtml(t('config.dashboard.new'))}</span>`
        : '';
      return `
        <button type="button"
                class="config-dash-option ${isSelected ? 'selected' : ''}"
                data-field="${field}"
                data-dash="${escapeHtml(opt.id)}">
          <div class="config-dash-preview ${opt.preview}"></div>
          <div class="config-dash-info">
            <strong>${escapeHtml(t(opt.labelKey))}${badge}</strong>
            <span>${escapeHtml(t(opt.descKey))}</span>
          </div>
        </button>
      `;
    }).join('');
  }

  function renderJobs() {
    const draft = host.getDraft();
    if (!draft) return;
    renderGrid(
      jobsEl,
      'dashboardStyleJobs',
      draft.dashboardStyleJobs || DEFAULT_DASHBOARD_STYLE
    );
  }

  function renderRefs() {
    const draft = host.getDraft();
    if (!draft) return;
    renderGrid(
      refsEl,
      'dashboardStyleRefs',
      draft.dashboardStyleRefs || DEFAULT_DASHBOARD_STYLE
    );
  }

  function handleClick(e) {
    const btn = e.target.closest('.config-dash-option');
    if (!btn) return;
    const draft = host.getDraft();
    if (!draft) return;

    const id = btn.dataset.dash;
    const field = btn.dataset.field;
    if (!DASHBOARD_STYLES.includes(id)) return;
    if (draft[field] === id) return;

    draft[field] = id;

    if (field === 'dashboardStyleJobs') renderJobs();
    else if (field === 'dashboardStyleRefs') renderRefs();

    host.updateBadge();
  }

  jobsEl.addEventListener('click', handleClick);
  refsEl.addEventListener('click', handleClick);

  function render() {
    renderJobs();
    renderRefs();
  }

  return { render };
}