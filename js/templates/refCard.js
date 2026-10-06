// ============================================================
// Template: referral card
// ============================================================

import { REF_WORKFLOW_STEPS } from '../constants.js';
import { isRefClosed, refStepIndex } from '../selectors.js';
import { escapeHtml, ensureArray } from '../utils.js';
import { renderSteps } from './steps.js';
import { t, tRefState, tRefStateShort } from '../i18n.js';

/**
 * @param {object} ref
 * @param {{ jobs: object[] }} ctx
 * @returns {string} HTML
 */
export function renderRefCard(ref, ctx = {}) {
  const { jobs = [] } = ctx;

  const linkTxt = ref.link
    ? `<a href="${escapeHtml(ref.link)}" target="_blank" rel="noopener">${escapeHtml(t('ref.link'))} ↗</a>`
    : '';
  const contactTxt = ref.contacto
    ? `<span>✉️ ${escapeHtml(ref.contacto)}</span>`
    : '';
  const roleTxt = ref.rol
    ? `<span>💼 ${escapeHtml(ref.rol)}</span>`
    : '';
  const notesTxt = ref.notas
    ? `<div class="ref-notas">${escapeHtml(ref.notas)}</div>`
    : '';

  const companies = ensureArray(ref.empresasVinculadas);
  const companiesTxt = companies.length
    ? `<div class="ref-empresas-lista">
         ${companies.map(e => {
           const job = jobs.find(j => j.empresa === e);
           const clickable = job
             ? `data-action="scroll-to-job" data-job-id="${job.id}" title="${escapeHtml(t('ref.goToJob', { empresa: e }))}"`
             : '';
           return `<span class="ref-empresa-tag" ${clickable}>🏢 ${escapeHtml(e)}</span>`;
         }).join('')}
       </div>`
    : '';

  const refClosed = isRefClosed(ref.estado);
  const currentIdx = refStepIndex(ref.estado);

  const stepsHtml = refClosed
    ? ''
    : renderSteps(REF_WORKFLOW_STEPS, currentIdx, [], {
        cssPrefix: 'ref-step',
        showSkipped: false,
        kind: 'ref',
      });

  const actionsHtml = refClosed
    ? `<div class="ref-wf-actions">
         <button class="ref-wf-btn" data-action="reopen-ref">↻ ${escapeHtml(t('ref.reopen'))}</button>
       </div>`
    : renderRefActions(ref, currentIdx);

  const pendingNote = currentRefStepNote(ref);
  const pendingNoteHtml = (!refClosed && pendingNote)
    ? `<div class="step-note">
         <span class="pd-label">PD</span>
         <span class="pd-text">${escapeHtml(pendingNote)}</span>
       </div>`
    : '';

  return `
    <div class="referido"
         data-relacion="${escapeHtml(ref.relacion || '')}"
         data-estado="${escapeHtml(ref.estado)}"
         data-id="${ref.id}">

      <div class="ref-body">
        <div class="ref-top">
          <h4>${escapeHtml(ref.nombre)}</h4>
          ${ref.relacion ? `<span class="ref-relacion-badge">${escapeHtml(ref.relacion)}</span>` : ''}
          <span class="ref-estado-badge" data-estado="${escapeHtml(ref.estado)}">${escapeHtml(tRefState(ref.estado))}</span>
        </div>

        <div class="ref-meta">${roleTxt}${contactTxt}${linkTxt}</div>
        ${companiesTxt}
        ${notesTxt}
        ${pendingNoteHtml}

        <div class="ref-workflow">
          ${stepsHtml}
          ${actionsHtml}
        </div>
      </div>

      <div class="ref-actions">
        <button class="action-btn history" title="${escapeHtml(t('ref.historyTitle'))}" data-action="ref-history">🕒</button>
        <button class="action-btn" title="${escapeHtml(t('ref.editTitle'))}" data-action="edit-ref">✏️</button>
        <button class="action-btn danger" title="${escapeHtml(t('ref.deleteTitle'))}" data-action="delete-ref">🗑️</button>
      </div>
    </div>
  `;
}

function renderRefActions(ref, currentIdx) {
  const canBack = currentIdx > 0;
  const canNext = currentIdx < REF_WORKFLOW_STEPS.length - 1;
  const prevStep = canBack ? REF_WORKFLOW_STEPS[currentIdx - 1] : null;
  const nextStep = canNext ? REF_WORKFLOW_STEPS[currentIdx + 1] : null;
  const alreadyWentBack = Boolean(ref.volvioAtras);

  const nextBtn = nextStep
    ? `<button class="ref-wf-btn primary" data-action="move-ref-next" title="${escapeHtml(t('ref.nextTitle', { step: tRefStateShort(nextStep.id) }))}">${escapeHtml(t('ref.next'))} ${escapeHtml(tRefStateShort(nextStep.id))}</button>`
    : `<button class="ref-wf-btn success" disabled title="${escapeHtml(t('ref.contratadoTitle'))}">✓ ${escapeHtml(t('ref.contratado'))}</button>`;

  let prevBtn = '';
  if (prevStep && !alreadyWentBack) {
    prevBtn = `<button class="ref-wf-btn" data-action="move-ref-prev" title="${escapeHtml(t('ref.prevTitle', { step: tRefStateShort(prevStep.id) }))}">${escapeHtml(t('ref.prev'))} ${escapeHtml(tRefStateShort(prevStep.id))}</button>`;
  } else if (prevStep && alreadyWentBack) {
    prevBtn = `<button class="ref-wf-btn" disabled title="${escapeHtml(t('toast.alreadyWentBackRef'))}">${escapeHtml(t('ref.prev'))} ${escapeHtml(tRefStateShort(prevStep.id))}</button>`;
  }

  return `
    <div class="ref-wf-actions">
      ${nextBtn}
      ${prevBtn}
      <button class="ref-wf-btn danger" data-action="close-ref" title="${escapeHtml(t('ref.notApplicableTitle'))}">${escapeHtml(t('ref.notApplicable'))}</button>
    </div>
  `;
}

function currentRefStepNote(ref) {
  const hist = ensureArray(ref.history);
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].estado === ref.estado && hist[i].nota) return hist[i].nota;
  }
  return null;
}