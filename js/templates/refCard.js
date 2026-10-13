// ============================================================
// Template: referral card
// V3 · Progress pegada al header + botones grandes
// Multiselect de relación
// ============================================================

import { REF_WORKFLOW_STEPS } from '../constants.js';
import { isRefClosed, refStepIndex } from '../selectors.js';
import { escapeHtml, ensureArray } from '../utils.js';
import { renderSteps } from './steps.js';
import { t, tRefState, tRefStateShort } from '../i18n.js';

/**
 * @param {object} ref
 * @param {{ jobs?: object[] }} ctx
 * @returns {string} HTML
 */
export function renderRefCard(ref /*, ctx = {} */) {
  const refClosed = isRefClosed(ref.estado);
  const currentIdx = refStepIndex(ref.estado);
  const totalSteps = REF_WORKFLOW_STEPS.length;
  const currentStepNum = currentIdx >= 0 ? currentIdx + 1 : 0;
  const progressPct = currentIdx >= 0
    ? Math.round(((currentIdx + 1) / totalSteps) * 100)
    : 0;

  // ------------------------------------------------------------
  // Relaciones: normalizamos a array (soporta legacy string)
  // ------------------------------------------------------------
  const relaciones = Array.isArray(ref.relacion)
    ? ref.relacion
    : (ref.relacion ? [ref.relacion] : []);

  const primaryRelacion = relaciones[0] || '';

  const relacionBadgesHtml = relaciones
    .map(rel => `<span class="ref-relacion-badge" data-relacion="${escapeHtml(rel)}">${escapeHtml(rel)}</span>`)
    .join('');

  // Meta inline
  const linkTxt = ref.link
    ? `<a href="${escapeHtml(ref.link)}" target="_blank" rel="noopener">${escapeHtml(t('ref.link'))} ↗</a>`
    : '';
  const contactTxt = ref.contacto
    ? `<span>✉️ ${escapeHtml(ref.contacto)}</span>`
    : '';
  const roleTxt = ref.rol
    ? `<span>💼 ${escapeHtml(ref.rol)}</span>`
    : '';
  const metaHtml = (roleTxt || contactTxt || linkTxt)
    ? `<div class="ref-meta">${roleTxt}${contactTxt}${linkTxt}</div>`
    : '';

  // Notas
  const notesTxt = ref.notas
    ? `<div class="ref-notas">${escapeHtml(ref.notas)}</div>`
    : '';

  // Steps
  const stepsHtml = refClosed
    ? ''
    : renderSteps(REF_WORKFLOW_STEPS, currentIdx, [], {
        cssPrefix: 'ref-step',
        showSkipped: false,
        kind: 'ref',
      });

  // Bloque de progreso superior (solo si no está cerrado)
  const topProgressHtml = refClosed
    ? ''
    : `<div class="ref-top-progress">
         <span class="stage-count">${currentStepNum} / ${totalSteps}</span>
         <div class="progress-bar"><div class="progress-fill" style="width: ${progressPct}%;"></div></div>
         <button type="button"
                 class="ref-history-btn"
                 data-action="ref-history"
                 title="${escapeHtml(t('ref.historyTitle'))}"
                 aria-label="${escapeHtml(t('ref.historyTitle'))}">
           🕒
         </button>
       </div>`;

  // Acciones
  const actionsHtml = refClosed
    ? renderClosedActions()
    : renderOpenActions(ref, currentIdx);

  // Nota pendiente del paso actual
  const pendingNote = currentRefStepNote(ref);
  const pendingNoteHtml = (!refClosed && pendingNote)
    ? `<div class="step-note">
         <span class="pd-label">PD</span>
         <span class="pd-text">${escapeHtml(pendingNote)}</span>
       </div>`
    : '';

  return `
    <div class="referido"
         data-relacion="${escapeHtml(primaryRelacion)}"
         data-estado="${escapeHtml(ref.estado)}"
         data-id="${ref.id}">

      <div class="ref-body">
        <div class="ref-top">
          <h4>${escapeHtml(ref.nombre)}</h4>
          ${relacionBadgesHtml}
          <span class="ref-estado-badge" data-estado="${escapeHtml(ref.estado)}">${escapeHtml(tRefState(ref.estado))}</span>
        </div>

        ${topProgressHtml}
        ${metaHtml}
        ${notesTxt}
        ${pendingNoteHtml}

        <div class="ref-workflow">
          ${stepsHtml}
          ${actionsHtml}
        </div>
      </div>

      <div class="ref-actions">
        <button class="action-btn" title="${escapeHtml(t('ref.editTitle'))}" data-action="edit-ref" aria-label="${escapeHtml(t('ref.editTitle'))}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
          </svg>
        </button>
        <button class="action-btn danger" title="${escapeHtml(t('ref.deleteTitle'))}" data-action="delete-ref" aria-label="${escapeHtml(t('ref.deleteTitle'))}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------
// Acciones cuando el referido está abierto
// ------------------------------------------------------------
function renderOpenActions(ref, currentIdx) {
  const canBack = currentIdx > 0;
  const canNext = currentIdx < REF_WORKFLOW_STEPS.length - 1;
  const prevStep = canBack ? REF_WORKFLOW_STEPS[currentIdx - 1] : null;
  const nextStep = canNext ? REF_WORKFLOW_STEPS[currentIdx + 1] : null;
  const alreadyWentBack = Boolean(ref.volvioAtras);
  const hasLinkedJob = Boolean(ref.linkedJobId);
  const backLocked = alreadyWentBack || hasLinkedJob;

  const nextBtn = nextStep
    ? `<button class="wf-btn-big primary"
              data-action="move-ref-next"
              title="${escapeHtml(t('ref.nextTitle', { step: tRefStateShort(nextStep.id) }))}">
         → ${escapeHtml(tRefStateShort(nextStep.id))}
       </button>`
    : `<button class="wf-btn-big success" disabled
              title="${escapeHtml(t('ref.contratadoTitle'))}">
         ✓ ${escapeHtml(t('ref.contratado'))}
       </button>`;

  let backBtn = '';
  if (prevStep) {
    const label = `← ${escapeHtml(tRefStateShort(prevStep.id))}`;
    if (!backLocked) {
      backBtn = `<button class="wf-btn-secondary"
                        data-action="move-ref-prev"
                        title="${escapeHtml(t('ref.prevTitle', { step: tRefStateShort(prevStep.id) }))}">
                   ${label}
                 </button>`;
    } else {
      const lockTitle = hasLinkedJob
        ? t('ref.lockedBackTitle')
        : t('toast.alreadyWentBackRef');
      backBtn = `<button class="wf-btn-secondary" disabled
                        title="${escapeHtml(lockTitle)}">
                   🔒 ${label}
                 </button>`;
    }
  } else {
    backBtn = `<button class="wf-btn-secondary" disabled>← ${escapeHtml(t('job.firstStep'))}</button>`;
  }

  const closeBtn = `<button class="wf-btn-secondary danger"
                            data-action="close-ref"
                            title="${escapeHtml(t('ref.notApplicableTitle'))}">
                      ${escapeHtml(t('ref.notApplicable'))}
                    </button>`;

  return `
    <div class="ref-wf-main-actions">
      ${nextBtn}
      ${backBtn}
      ${closeBtn}
    </div>
  `;
}

// ------------------------------------------------------------
// Acciones cuando el referido está cerrado (No aplica)
// ------------------------------------------------------------
function renderClosedActions() {
  return `
    <div class="ref-wf-main-actions">
      <button class="wf-btn-big primary" data-action="reopen-ref">
        ↻ ${escapeHtml(t('ref.reopen'))}
      </button>
    </div>
  `;
}

// ------------------------------------------------------------
// Nota del paso actual
// ------------------------------------------------------------
function currentRefStepNote(ref) {
  const hist = ensureArray(ref.history);
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].estado === ref.estado && hist[i].nota) return hist[i].nota;
  }
  return null;
}