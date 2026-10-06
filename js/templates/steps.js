// ============================================================
// Template: workflow step bar (jobs and referrals)
// ============================================================

import { escapeHtml } from '../utils.js';
import { t, tStateShort, tRefStateShort } from '../i18n.js';

/**
 * @param {Array<{id:string, short:string}>} steps
 * @param {number} currentIdx  current step index (-1 if closed)
 * @param {string[]} skipped   step ids marked as not applicable
 * @param {{ cssPrefix?: string, showSkipped?: boolean, kind?: 'job'|'ref' }} opts
 * @returns {string} HTML
 */
export function renderSteps(steps, currentIdx, skipped = [], opts = {}) {
  const {
    cssPrefix = 'step',
    showSkipped = true,
    kind = 'job',
  } = opts;

  const wrapperClass = cssPrefix === 'step' ? 'steps' : 'ref-steps';
  const dotClass    = cssPrefix === 'step' ? 'step-dot' : 'ref-step-dot';
  const lineClass   = cssPrefix === 'step' ? 'step-line' : 'ref-step-line';
  const labelClass  = cssPrefix === 'step' ? 'step-label' : 'ref-step-label';

  const labelFor = (id) => (kind === 'ref' ? tRefStateShort(id) : tStateShort(id));

  return `
    <div class="${wrapperClass}">
      ${steps.map((s, idx) => {
        let cls = '';
        const wasSkipped = showSkipped && Array.isArray(skipped) && skipped.includes(s.id);

        if (wasSkipped)              cls = 'skipped';
        else if (idx < currentIdx)   cls = 'done';
        else if (idx === currentIdx) cls = 'current';

        const dot = cls === 'skipped'
          ? '—'
          : (cls === 'done' ? '✓' : (idx + 1));

        const label = labelFor(s.id);

        const titleAttr = cls === 'skipped'
          ? `${escapeHtml(label)} (${escapeHtml(t('job.notApplicable'))})`
          : escapeHtml(label);

        return `
          <div class="${cssPrefix} ${cls}" data-step="${escapeHtml(s.id)}" title="${titleAttr}">
            <div class="${dotClass}">${dot}</div>
            <div class="${lineClass}"></div>
            <div class="${labelClass}">${escapeHtml(label)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}