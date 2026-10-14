// ============================================================
// Config panel: Initial statuses
//
//   - Checkboxes for each workflow step.
//   - A "default status" picker restricted to the checked ones.
// ============================================================

import { WORKFLOW_STEPS } from '../../app/constants.js';
import { escapeHtml } from '../../app/utils.js';
import { icon } from '../../app/icons.js';
import { t, tState } from '../../i18n/index.js';

export function mountStatusesPanel(host) {
  const checksEl = document.getElementById('configStatuses');
  const defaultsEl = document.getElementById('configDefaultStatus');

  // ----------------------------------------------------------
  // Checkboxes
  // ----------------------------------------------------------
  function renderChecks() {
    const draft = host.getDraft();
    if (!draft) return;
    const active = new Set(draft.initialStatuses || []);

    checksEl.innerHTML = WORKFLOW_STEPS.map(s => {
      const checked = active.has(s.id);
      return `
        <label class="config-check ${checked ? 'checked' : ''}">
          <input type="checkbox" data-status="${escapeHtml(s.id)}" ${checked ? 'checked' : ''}>
          ${icon(s.icon)}
          <span>${escapeHtml(tState(s.id))}</span>
        </label>
      `;
    }).join('');
  }

  checksEl.addEventListener('change', (e) => {
    const input = e.target.closest('input[type="checkbox"]');
    if (!input) return;
    const draft = host.getDraft();
    if (!draft) return;

    const status = input.dataset.status;
    const statusSet = new Set(draft.initialStatuses || []);

    if (input.checked) {
      statusSet.add(status);
      if (status === host.getPreferredDefaultStatus()) {
        draft.defaultInitialStatus = status;
      }
    } else {
      statusSet.delete(status);
    }

    draft.initialStatuses = [...statusSet];

    if (statusSet.size > 0 && !statusSet.has(draft.defaultInitialStatus)) {
      draft.defaultInitialStatus = [...statusSet][0];
    }

    host.renderAll();
  });

  // ----------------------------------------------------------
  // Default picker
  // ----------------------------------------------------------
  function renderDefaults() {
    const draft = host.getDraft();
    if (!draft) return;
    const active = draft.initialStatuses || [];

    if (active.length === 0) {
      defaultsEl.innerHTML = `<div class="config-empty">${escapeHtml(t('config.noStates'))}</div>`;
      return;
    }

    defaultsEl.innerHTML = active.map(id => {
      const step = WORKFLOW_STEPS.find(s => s.id === id);
      const iconName = step ? step.icon : 'icon-sparkle';
      const isSelected = id === draft.defaultInitialStatus ? 'selected' : '';
      return `
        <button type="button"
                class="config-default-btn ${isSelected}"
                data-status="${escapeHtml(id)}">
          ${icon(iconName)}
          <span>${escapeHtml(tState(id))}</span>
        </button>
      `;
    }).join('');
  }

  defaultsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.config-default-btn');
    if (!btn) return;
    const draft = host.getDraft();
    if (!draft) return;

    draft.defaultInitialStatus = btn.dataset.status;
    host.setPreferredDefaultStatus(btn.dataset.status);
    host.renderAll();
  });

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  function render() {
    renderChecks();
    renderDefaults();
  }

  return { render };
}