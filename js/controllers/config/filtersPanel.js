// ============================================================
// Config panel: Application filters
//
//   - Reorder with up/down arrows.
//   - Show/hide with an eye toggle.
//   - Built-in filter chips ("all", "active", "closed") are
//     marked as "Fixed".
// ============================================================

import {
  WORKFLOW_STEPS, CONFIG_FILTER_META,
} from '../../app/constants.js';
import { escapeHtml, cloneArray } from '../../app/utils.js';
import { icon } from '../../app/icons.js';
import { t, tStateShort } from '../../i18n/index.js';

export function mountFiltersPanel(host) {
  const listEl = document.getElementById('configFilters');

  function getFilterLabel(id) {
    const meta = CONFIG_FILTER_META[id];
    if (meta) return { label: t('filter.' + id), icon: meta.icon, builtin: true };
    const step = WORKFLOW_STEPS.find(s => s.id === id);
    if (step) return { label: tStateShort(id), icon: step.icon, builtin: false };
    return { label: id, icon: 'icon-sparkle', builtin: false };
  }

  function render() {
    const draft = host.getDraft();
    if (!draft) return;

    const filters = draft.filters || [];
    listEl.innerHTML = filters.map((f, idx) => {
      const { label, icon: iconName, builtin } = getFilterLabel(f.id);
      return `
        <div class="config-filter-item ${f.visible ? '' : 'hidden'}">
          <div class="drag-info">
            ${icon(iconName)}
            <span>${escapeHtml(label)}</span>
            ${builtin ? `<span class="builtin-tag">${escapeHtml(t('config.fixed'))}</span>` : ''}
          </div>
          <div class="config-filter-actions">
            <button type="button"
                    class="config-icon-btn"
                    data-move="up"
                    data-idx="${idx}"
                    ${idx === 0 ? 'disabled' : ''}
                    title="${escapeHtml(t('config.moveUp'))}">↑</button>
            <button type="button"
                    class="config-icon-btn"
                    data-move="down"
                    data-idx="${idx}"
                    ${idx === filters.length - 1 ? 'disabled' : ''}
                    title="${escapeHtml(t('config.moveDown'))}">↓</button>
            <button type="button"
                    class="config-icon-btn ${f.visible ? 'eye-on' : 'eye-off'}"
                    data-toggle="${idx}"
                    title="${f.visible ? t('config.hideFilter') : t('config.showFilter')}">
              ${icon(f.visible ? 'icon-eye' : 'icon-eye-off')}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  listEl.addEventListener('click', (e) => {
    const draft = host.getDraft();
    if (!draft) return;

    const moveBtn = e.target.closest('[data-move]');
    if (moveBtn && !moveBtn.disabled) {
      const idx = Number(moveBtn.dataset.idx);
      const dir = moveBtn.dataset.move === 'up' ? -1 : 1;
      const targetIdx = idx + dir;
      const filters = cloneArray(draft.filters);
      if (targetIdx < 0 || targetIdx >= filters.length) return;
      [filters[idx], filters[targetIdx]] = [filters[targetIdx], filters[idx]];
      draft.filters = filters;
      host.renderAll();
      return;
    }

    const toggleBtn = e.target.closest('[data-toggle]');
    if (toggleBtn) {
      const idx = Number(toggleBtn.dataset.toggle);
      const filters = cloneArray(draft.filters);
      filters[idx] = { ...filters[idx], visible: !filters[idx].visible };
      draft.filters = filters;
      host.renderAll();
    }
  });

  return { render };
}