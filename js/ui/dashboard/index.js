// ============================================================
// Dashboard · Entry point
//
// Renders one of six styles inside a unified wrapper:
//   sparklines | modular | minimal | compact | circular | heatmap
//
// Each style is implemented in its own file. This module only
// dispatches and renders the header + summary strip.
// ============================================================

import { escapeHtml, renderSummary } from './shared.js';
import { renderSparklines } from './sparklines.js';
import { renderModular }    from './modular.js';
import { renderMinimal }    from './minimal.js';
import { renderCompact }    from './compact.js';
import { renderCircular }   from './circular.js';
import { renderHeatmap }    from './heatmap.js';

// ------------------------------------------------------------
// Header icons per dashboard kind.
// Both icons live in assets/icons.svg — the strings are <use>
// references so the sprite stays the single source of truth.
// ------------------------------------------------------------
const DASH_ICONS = {
  jobs: `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="./assets/icons.svg#icon-clipboard"/></svg>`,
  refs: `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="./assets/icons.svg#icon-chain"/></svg>`,
};

// ------------------------------------------------------------
// Entry point
// ------------------------------------------------------------
export function renderDashboard(container, data) {
  if (!container) return;
  container.innerHTML = '';

  const kind = data.kind === 'refs' ? 'refs' : 'jobs';
  const label = data.label || '';
  const iconSvg = DASH_ICONS[kind] || DASH_ICONS.jobs;

  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = `dash-labeled ${kind}`;

  const header = document.createElement('div');
  header.className = 'dash-labeled-header';
  header.innerHTML = `
    <div class="dash-labeled-icon">${iconSvg}</div>
    <div class="dash-labeled-title">${escapeHtml(label)}</div>
  `;
  wrapper.appendChild(header);

  const body = document.createElement('div');
  body.className = 'dash-labeled-body';

  switch (data.style) {
    case 'modular':  renderModular(body, data);  break;
    case 'minimal':  renderMinimal(body, data);  break;
    case 'compact':  renderCompact(body, data);  break;
    case 'circular': renderCircular(body, data); break;
    case 'heatmap':  renderHeatmap(body, data);  break;
    case 'sparklines':
    default:
      renderSparklines(body, data);
      break;
  }

  // The summary strip is always rendered, for all 6 styles.
  renderSummary(body, data);

  wrapper.appendChild(body);
  container.appendChild(wrapper);
}