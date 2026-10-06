// ============================================================
// Template: referral card
// ============================================================

import { REF_WORKFLOW_STEPS } from '../constants.js';
import { isRefClosed, refStepIndex } from '../selectors.js';
import { escapeHtml, ensureArray } from '../utils.js';
import { renderSteps } from './steps.js';

/**
 * @param {object} ref
 * @param {{
 *   jobs: object[],
 * }} ctx
 * @returns {string} HTML
 */
export function renderRefCard(ref, ctx = {}) {
  const { jobs = [] } = ctx;

  const linkTxt = ref.link
    ? `<a href="${escapeHtml(ref.link)}" target="_blank" rel="noopener">Link ↗</a>`
    : '';
  const contactoTxt = ref.contacto
    ? `<span>✉️ ${escapeHtml(ref.contacto)}</span>`
    : '';
  const rolTxt = ref.rol
    ? `<span>💼 ${escapeHtml(ref.rol)}</span>`
    : '';
  const notasTxt = ref.notas
    ? `<div class="ref-notas">${escapeHtml(ref.notas)}</div>`
    : '';

  const empresas = ensureArray(ref.empresasVinculadas);
  const empresasTxt = empresas.length
    ? `<div class="ref-empresas-lista">
         ${empresas.map(e => {
           const job = jobs.find(j => j.empresa === e);
           const clickable = job
             ? `data-action="scroll-to-job" data-job-id="${job.id}" title="Ir a la postulación en ${escapeHtml(e)}"`
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
      });

  const actionsHtml = refClosed
    ? `<div class="ref-wf-actions">
         <button class="ref-wf-btn" data-action="reopen-ref">↻ Reabrir</button>
       </div>`
    : renderRefActions(ref, currentIdx);

  // NEW: show current note (same stage) as PD
  const pd = currentRefStepNote(ref);
  const pdHtml = (!refClosed && pd)
    ? `<div class="step-note">
         <span class="pd-label">PD</span>
         <span class="pd-text">${escapeHtml(pd)}</span>
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
          <span class="ref-estado-badge" data-estado="${escapeHtml(ref.estado)}">${escapeHtml(ref.estado)}</span>
        </div>

        <div class="ref-meta">${rolTxt}${contactoTxt}${linkTxt}</div>
        ${empresasTxt}
        ${notasTxt}
        ${pdHtml}

        <div class="ref-workflow">
          ${stepsHtml}
          ${actionsHtml}
        </div>
      </div>

      <div class="ref-actions">
        <button class="action-btn history" title="Ver historial" data-action="ref-history">🕒</button>
        <button class="action-btn" title="Editar" data-action="edit-ref">✏️</button>
        <button class="action-btn danger" title="Borrar" data-action="delete-ref">🗑️</button>
      </div>
    </div>
  `;
}

function renderRefActions(ref, currentIdx) {
  const canBack = currentIdx > 0;
  const canNext = currentIdx < REF_WORKFLOW_STEPS.length - 1;
  const prevStep = canBack ? REF_WORKFLOW_STEPS[currentIdx - 1] : null;
  const nextStep = canNext ? REF_WORKFLOW_STEPS[currentIdx + 1] : null;
  const yaVolvio = Boolean(ref.volvioAtras);

  const nextBtn = nextStep
    ? `<button class="ref-wf-btn primary" data-action="move-ref-next">→ ${escapeHtml(nextStep.short)}</button>`
    : `<button class="ref-wf-btn success" disabled>✓ Contratado</button>`;

  let prevBtn = '';
  if (prevStep && !yaVolvio) {
    prevBtn = `<button class="ref-wf-btn" data-action="move-ref-prev" title="Volver a ${escapeHtml(prevStep.short)}">← ${escapeHtml(prevStep.short)}</button>`;
  } else if (prevStep && yaVolvio) {
    prevBtn = `<button class="ref-wf-btn" disabled title="Ya volviste atrás una vez en este referido">← ${escapeHtml(prevStep.short)}</button>`;
  }

  return `
    <div class="ref-wf-actions">
      ${nextBtn}
      ${prevBtn}
      <button class="ref-wf-btn danger" data-action="close-ref">No aplica</button>
    </div>
  `;
}

/**
 * Finds the last registered note for the referral's current stage.
 * @param {object} ref
 * @returns {string|null}
 */
function currentRefStepNote(ref) {
  const hist = ensureArray(ref.history);
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].estado === ref.estado && hist[i].nota) return hist[i].nota;
  }
  return null;
}