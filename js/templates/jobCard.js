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

/**
 * @param {object} job
 * @param {{
 *   referidos: object[],
 *   index?: number,
 * }} ctx
 * @returns {string} HTML
 */
export function renderJobCard(job, ctx = {}) {
  const { referidos = [], index = 0 } = ctx;

  const days = daysSince(job.fecha);
  const daysTxt = days !== null
    ? `<span>⏱️ hace ${days} día${days === 1 ? '' : 's'}</span>`
    : '';
  const dateTxt = job.fecha ? `<span>📅 ${formatDate(job.fecha)}</span>` : '';
  const salaryTxt = job.salario
    ? `<span>💰 ${escapeHtml(job.salario)}${job.salarioPorHora ? ' · por hora' : ''}</span>`
    : '';
  const contactTxt = job.contacto ? `<span>👤 ${escapeHtml(job.contacto)}</span>` : '';
  const linkTxt = job.link
    ? `<a href="${escapeHtml(job.link)}" target="_blank" rel="noopener">Ver oferta ↗</a>`
    : '';
  const notesTxt = job.notas
    ? `<div class="job-notas">${escapeHtml(job.notas)}</div>`
    : '';

  const linkedRefs = refsForCompany(referidos, job.empresa);
  const refsHtml = linkedRefs.length
    ? `<div class="job-refs">
         <span class="job-refs-label">Referido${linkedRefs.length === 1 ? '' : 's'}</span>
         ${linkedRefs.map(r => `
           <button type="button"
                   class="job-ref-chip"
                   data-action="scroll-to-ref"
                   data-ref-id="${r.id}"
                   data-estado="${escapeHtml(r.estado)}"
                   title="Ver referido: ${escapeHtml(r.nombre)}">
             <span class="job-ref-estado-dot"></span>
             ${escapeHtml(r.nombre)}
           </button>
         `).join('')}
       </div>`
    : '';

  const closed = isClosed(job.estado);
  const currentIdx = stepIndex(job.estado);
  const pct = progressPct(job.estado);

  const stepsHtml = closed ? '' : renderSteps(
    WORKFLOW_STEPS,
    currentIdx,
    ensureArray(job.skipped)
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
              title="Ver historial completo de la postulación">
        🕒 Ver historial · <strong>${currentIdx + 1}/${WORKFLOW_STEPS.length}</strong> etapas
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

      <div class="drag-handle" title="Arrastrar para reordenar">⠿</div>

      <div class="job-header">
        <div class="job-info">
          <h3>${escapeHtml(job.puesto)} <span class="company">· ${escapeHtml(job.empresa)}</span></h3>
          <div class="job-meta">${dateTxt}${daysTxt}${salaryTxt}${contactTxt}</div>
        </div>
        <div class="job-actions">
          <button class="action-btn history" title="Ver historial" data-action="history">🕒</button>
          <button class="action-btn" title="Editar" data-action="edit">✏️</button>
          <button class="action-btn danger" title="Borrar" data-action="delete">🗑️</button>
        </div>
      </div>

      ${notesTxt}
      ${linkTxt}
      <span class="badge" data-estado="${escapeHtml(job.estado)}">${escapeHtml(job.estado)}</span>
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
    ? `<button class="wf-btn-big" data-action="move-next">Avanzar a "${escapeHtml(nextStep.short)}"</button>`
    : `<button class="wf-btn-big success" data-action="close-offer">Confirmar Oferta</button>`;

  let backBtn;
  if (prevStep && !alreadyWentBack) {
    backBtn = `<button class="wf-btn-secondary" data-action="move-prev" title="Volver a ${escapeHtml(prevStep.short)}">Volver a "${escapeHtml(prevStep.short)}"</button>`;
  } else if (prevStep && alreadyWentBack) {
    backBtn = `<button class="wf-btn-secondary" disabled title="Ya volviste atrás una vez en esta postulación">Volver a "${escapeHtml(prevStep.short)}"</button>`;
  } else {
    backBtn = `<button class="wf-btn-secondary" disabled title="Ya estás en el primer paso">Primer paso</button>`;
  }

  const skipBtn = nextStep
    ? `<button class="wf-btn-skip" data-action="skip-step" title="Esta etapa no aplica, pasar a la siguiente">No aplica</button>`
    : '';

  const offerCloseBtn = !isOffer
    ? `<button class="wf-close-btn offer" data-action="close" data-estado="Oferta">Oferta</button>`
    : '';

  return `
    <div class="wf-section">
      <div class="wf-section-label">Próximo paso</div>
      <div class="wf-main-actions">
        ${mainBtn}
        ${backBtn}
        ${skipBtn}
      </div>

      <div class="wf-close-actions">
        <div class="wf-section-label">O cerrar como…</div>
        ${offerCloseBtn}
        <button class="wf-close-btn reject" data-action="close" data-estado="Rechazado">Rechazado</button>
        <button class="wf-close-btn"        data-action="close" data-estado="Ghosted">Ghosted</button>
        <button class="wf-close-btn"        data-action="close" data-estado="Descartado">Descartado</button>
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
    ? ` · cerrada el ${formatDate(last.fecha.slice(0, 10))}`
    : '';

  return `
    <div class="closed-banner" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;flex-wrap:wrap;">
        <div class="text">
          Postulación <strong>${escapeHtml(job.estado)}</strong>${fecha}
        </div>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
          <button class="status-clickable" data-action="history" title="Ver historial completo">🕒 Ver historial</button>
          <button class="wf-btn-secondary" data-action="reopen">Reabrir</button>
        </div>
      </div>
      ${reasonTxt}
    </div>
  `;
}