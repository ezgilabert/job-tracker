// ============================================================
// Config panel: Language
// ============================================================

import { SUPPORTED_LANGS } from '../../i18n/index.js';
import { DEFAULT_LANG } from '../../app/constants.js';
import { escapeHtml } from '../../app/utils.js';

export function mountLanguagePanel(host) {
  const listEl = document.getElementById('configLangs');

  function render() {
    const draft = host.getDraft();
    if (!draft) return;
    const current = draft.lang || DEFAULT_LANG;

    listEl.innerHTML = SUPPORTED_LANGS.map(lang => {
      const selected = lang.id === current;
      return `
        <button type="button"
                class="config-lang-option ${selected ? 'selected' : ''}"
                data-lang="${escapeHtml(lang.id)}">
          <div class="config-lang-flag">${escapeHtml(lang.code)}</div>
          <div class="config-lang-info">
            <strong>${escapeHtml(lang.label)}</strong>
            <span>${escapeHtml(lang.hint)}</span>
          </div>
          <div class="config-lang-check"></div>
        </button>
      `;
    }).join('');
  }

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.config-lang-option');
    if (!btn) return;
    const draft = host.getDraft();
    if (!draft) return;

    const id = btn.dataset.lang;
    if ((draft.lang || DEFAULT_LANG) !== id) {
      draft.lang = id;
      render();
      host.updateBadge();
    }
  });

  return { render };
}