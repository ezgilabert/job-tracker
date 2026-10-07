// ============================================================
// Template: job card
// ============================================================

import { WORKFLOW_STEPS } from '../constants.js';
import {
  isClosed, stepIndex, progressPct,
  currentStepNote, lastHistoryEntry, refsForCompany,
} from '../selectors.js';
import { escapeHtml, daysSince, formatDate, ensureArray } from '../utils.js';
import { renderSteps } from './steps.js';
import { t, tState, tStateShort } from '../i18n.js';

/**
 * @param {object} job
 * @param {{ referidos: object[], index?: number }} ctx
 * @returns {string} HTML
 */
export function renderJobCard(job, ctx = {}) {
  const { referidos = [], index = 0 } = ctx;

  const days = daysSince(job.fecha);
  const daysTxt = days !== null
    ? `<span>⏱️ ${t(days === 1 ? 'job.daysAgoOne' : 'job.daysAgoMany', { n: days })}</span>`
    : '';
  const dateTxt = job.fecha ? `<span>📅 ${formatDate(job.fecha)}</span>` : '';
  const salaryTxt = job.salario
    ? `<span>💰 ${escapeHtml(job.salario)}${job.salarioPorHora ? ' · ' + t('job.perHour') : ''}</span>`
    : '';
  const contactTxt = job.contacto ? `<span>👤 ${escapeHtml(job.contacto)}</span>` : '';
  const linkTxt = job.link
    ? `<a href="${escapeHtml(job.link)}" target="_blank" rel="noopener">${escapeHtml(t('job.viewOffer'))} ↗</a>`
    : '';
  const notesTxt = job.notas
    ? `<div class="job-notas">${escapeHtml(job.notas)}</div>`
    : '';

  const linkedRefs = refsForCompany(referidos, job.empresa);
  const refsHtml = linkedRefs.length
    ? `<div class="job-refs">
         <span class="job-refs-label">${escapeHtml(t(linkedRefs.length === 1 ? 'job.referidoOne' : 'job.referidoMany'))}</span>
         ${linkedRefs.map(r => `
           <button type="button"
                   class="job-ref-chip"
                   data-action="scroll-to-ref"
                   data-ref-id="${r.id}"
                   data-estado="${escapeHtml(r.estado)}"
                   title="${escapeHtml(t('job.refChipTitle', { name: r.nombre }))}">
             <span class="job-ref-estado-dot"></span>
             ${escapeHtml(r.nombre)}
           </button>
         `).join('')}
       </div>`
    : '';

  const closed = isClosed(job.estado);
  const currentIdx = stepIndex(job.estado);
  const pct = progressPct(job.estado);

  // Golden diagonal ribbon for the final stage (Offer)
  const offerRibbon = job.estado === 'Oferta'
    ? `<span class="job-offer-ribbon" aria-hidden="true">${escapeHtml(t('job.offerRibbon'))}</span>`
    : '';

  const stepsHtml = closed ? '' : renderSteps(
    WORKFLOW_STEPS,
    currentIdx,
    ensureArray(job.skipped),
    { kind: 'job' }
  );

  const pendingNote = currentStepNote(job);
  const pendingNoteHtml = (!closed && pendingNote)
    ? `<div class="step-note">
         <span class="pd-label">PD</span>
         <span class="pd-text">${escapeHtml(pendingNote)}</span>
       </div>`
    : '';

  const workflowActions = closed
    ? renderClosedActions(job)
    : renderOpenActions(job, currentIdx);

  const statusBlock = closed ? '' : `
    <div class="workflow-status">
      <button type="button"
              class="status-clickable"
              data-action="history"
              title="${escapeHtml(t('job.historyTitle'))}">
        🕒 ${escapeHtml(t('job.history'))} · <strong>${currentIdx + 1}/${WORKFLOW_STEPS.length}</strong> ${escapeHtml(t('job.historyStages'))}
      </button>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
  `;

  return `
    <div class="job"
         data-estado="${escapeHtml(job.estado)}"
         data-id="${job.id}"
         draggable="true"
         style="animation-delay:${Math.min(index * 40, 400)}ms">

      <div class="drag-handle" title="${escapeHtml(t('job.dragHandle'))}">⠿</div>
      ${offerRibbon}

      <div class="job-header">
        <div class="job-info">
          <h3>${escapeHtml(job.puesto)} <span class="company">· ${escapeHtml(job.empresa)}</span></h3>
          <div class="job-meta">${dateTxt}${daysTxt}${salaryTxt}${contactTxt}</div>
        </div>
        <div class="job-actions">
          <button class="action-btn" title="${escapeHtml(t('job.editTitle'))}" data-action="edit">✏️</button>
          <button class="action-btn danger" title="${escapeHtml(t('job.deleteTitle'))}" data-action="delete">🗑️</button>
        </div>
      </div>

      ${notesTxt}
      ${linkTxt}
      <span class="badge" data-estado="${escapeHtml(job.estado)}">${escapeHtml(tState(job.estado))}</span>
      ${refsHtml}
      ${pendingNoteHtml}

      <div class="workflow ${closed ? 'closed' : ''}">
        ${stepsHtml}
        ${statusBlock}
        ${workflowActions}
      </div>
    </div>
  `;
}

// ------------------------------------------------------------
// Open-job actions
// ------------------------------------------------------------
function renderOpenActions(job, currentIdx) {
  const canBack = currentIdx > 0;
  const canNext = currentIdx < WORKFLOW_STEPS.length - 1;
  const prevStep = canBack ? WORKFLOW_STEPS[currentIdx - 1] : null;
  const nextStep = canNext ? WORKFLOW_STEPS[currentIdx + 1] : null;
  const isOffer = job.estado === 'Oferta';
  const alreadyWentBack = Boolean(job.volvioAtras);

  const mainBtn = nextStep
    ? `<button class="wf-btn-big" data-action="move-next">${escapeHtml(t('job.advanceTo', { step: tStateShort(nextStep.id) }))}</button>`
    : `<button class="wf-btn-big success" data-action="close-offer">${escapeHtml(t('job.confirmOffer'))}</button>`;

  let backBtn;
  if (prevStep && !alreadyWentBack) {
    const backLabel = t('job.backTo', { step: tStateShort(prevStep.id) });
    const backTitle = t('job.backToTitle', { step: tStateShort(prevStep.id) });
    backBtn = `<button class="wf-btn-secondary" data-action="move-prev" title="${escapeHtml(backTitle)}">${escapeHtml(backLabel)}</button>`;
  } else if (prevStep && alreadyWentBack) {
    const backLabel = t('job.backTo', { step: tStateShort(prevStep.id) });
    backBtn = `<button class="wf-btn-secondary" disabled title="${escapeHtml(t('job.alreadyWentBack'))}">${escapeHtml(backLabel)}</button>`;
  } else {
    backBtn = `<button class="wf-btn-secondary" disabled title="${escapeHtml(t('job.firstStepTitle'))}">${escapeHtml(t('job.firstStep'))}</button>`;
  }

  const skipBtn = nextStep
    ? `<button class="wf-btn-skip" data-action="skip-step" title="${escapeHtml(t('job.notApplicableTitle'))}">${escapeHtml(t('job.notApplicable'))}</button>`
    : '';

  const offerCloseBtn = !isOffer
    ? `<button class="wf-close-btn offer" data-action="close" data-estado="Oferta">${escapeHtml(t('job.closeOffer'))}</button>`
    : '';

  return `
    <div class="wf-section">
      <div class="wf-section-label">${escapeHtml(t('job.nextStep'))}</div>
      <div class="wf-main-actions">
        ${mainBtn}
        ${backBtn}
        ${skipBtn}
      </div>

      <div class="wf-close-actions">
        <div class="wf-section-label">${escapeHtml(t('job.orCloseAs'))}</div>
        ${offerCloseBtn}
        <button class="wf-close-btn reject" data-action="close" data-estado="Rechazado">${escapeHtml(t('job.closeRejected'))}</button>
        <button class="wf-close-btn"        data-action="close" data-estado="Ghosted">${escapeHtml(t('job.closeGhosted'))}</button>
        <button class="wf-close-btn"        data-action="close" data-estado="Descartado">${escapeHtml(t('job.closeDiscarded'))}</button>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------
// Closed-job actions
// ------------------------------------------------------------
function renderClosedActions(job) {
  const last = lastHistoryEntry(job);
  const reasonTxt = last && last.motivo
    ? `<div class="closed-banner-motivo">"${escapeHtml(last.motivo)}"</div>`
    : '';
  const fecha = last && last.fecha
    ? ` · ${escapeHtml(t('job.closedOn'))} ${formatDate(last.fecha.slice(0, 10))}`
    : '';

  return `
    <div class="closed-banner" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;flex-wrap:wrap;">
        <div class="text">
          ${escapeHtml(t('job.closedLabel'))} <strong>${escapeHtml(tState(job.estado))}</strong>${fecha}
        </div>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
          <button class="status-clickable" data-action="history" title="${escapeHtml(t('job.historyTitle'))}">🕒 ${escapeHtml(t('job.history'))}</button>
          <button class="wf-btn-secondary" data-action="reopen">${escapeHtml(t('job.reopen'))}</button>
        </div>
      </div>
      ${reasonTxt}
    </div>
  `;
}