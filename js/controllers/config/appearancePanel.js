// ============================================================
// Config panel: Appearance
//
//   - Logo picker.
//   - Background picker (with live preview on click).
// ============================================================

import {
  LOGO_OPTIONS, DEFAULT_LOGO,
  BACKGROUND_OPTIONS, DEFAULT_BACKGROUND,
} from '../../app/constants.js';
import { escapeHtml } from '../../app/utils.js';

export function mountAppearancePanel(host) {
  const logosEl = document.getElementById('configLogos');
  const bgsEl = document.getElementById('configBgs');

  // ----------------------------------------------------------
  // Logos
  // ----------------------------------------------------------
  function renderLogos() {
    const draft = host.getDraft();
    if (!draft) return;
    const current = draft.logo || DEFAULT_LOGO;

    logosEl.innerHTML = LOGO_OPTIONS.map(opt => {
      const isSelected = opt.id === current;
      return `
        <button type="button"
                class="config-logo-option ${isSelected ? 'selected' : ''}"
                data-logo="${escapeHtml(opt.id)}">
          <div class="config-logo-preview">${opt.svg}</div>
          <div class="config-logo-info">
            <strong>${escapeHtml(opt.label)}</strong>
            <span>${escapeHtml(opt.description)}</span>
          </div>
          <div class="config-logo-check"></div>
        </button>
      `;
    }).join('');
  }

  logosEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.config-logo-option');
    if (!btn) return;
    const draft = host.getDraft();
    if (!draft) return;

    const id = btn.dataset.logo;
    if ((draft.logo || DEFAULT_LOGO) !== id) {
      draft.logo = id;
      renderLogos();
      host.updateBadge();
    }
  });

  // ----------------------------------------------------------
  // Backgrounds
  // ----------------------------------------------------------
  function renderBackgrounds() {
    const draft = host.getDraft();
    if (!draft) return;
    const current = draft.background || DEFAULT_BACKGROUND;

    bgsEl.innerHTML = BACKGROUND_OPTIONS.map(opt => {
      const isSelected = opt.id === current;
      const previewClass = opt.id === 'none' ? 'bg-none' : `bg-${opt.id}`;
      return `
        <button type="button"
                class="config-bg-option ${isSelected ? 'selected' : ''}"
                data-bg="${escapeHtml(opt.id)}">
          <div class="config-bg-preview ${previewClass}"></div>
          <div class="config-bg-info">
            <strong>${escapeHtml(opt.label)}</strong>
            <span>${escapeHtml(opt.description)}</span>
          </div>
          <div class="config-bg-check"></div>
        </button>
      `;
    }).join('');
  }

  bgsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.config-bg-option');
    if (!btn) return;
    const draft = host.getDraft();
    if (!draft) return;

    const id = btn.dataset.bg;
    if ((draft.background || DEFAULT_BACKGROUND) !== id) {
      draft.background = id;
      host.applyBackground(id); // live preview
      renderBackgrounds();
      host.updateBadge();
    }
  });

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  function render() {
    renderLogos();
    renderBackgrounds();
  }

  return { render };
}