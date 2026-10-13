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
 * @param {{ referrals: object[], index?: number }} ctx
 * @returns {string} HTML
 */
export function renderJobCard(job, ctx = {}) {
  const { referrals = [], index = 0 } = ctx;

  const days = daysSince(job.date);
  const daysTxt = days !== null
    ? `<span>⏱️ ${t(days === 1 ? 'job.daysAgoOne' : 'job.daysAgoMany', { n: days })}</span>`
    : '';
  const dateTxt = job.date ? `<span>📅 ${formatDate(job.date)}</span>` : '';
  const salaryTxt = renderSalaryTag(job);
  const workModeTxt = renderWorkModeTag(job);
  const contactTxt = renderContactChip(job);
  const linkTxt = job.link
    ? `<a href="${escapeHtml(job.link)}" target="_blank" rel="noopener">${escapeHtml(t('job.viewOffer'))} ↗</a>`
    : '';
  const notesTxt = job.notes
    ? `<div class="job-notes">${escapeHtml(job.notes)}</div>`
    : '';

  const roleDisplay = job.role || t('job.noRole');

  const linkedRefs = refsForCompany(referrals, job.company);
  const refsHtml = linkedRefs.length
    ? `<div class="job-refs">
         <span class="job-refs-label">${escapeHtml(t(linkedRefs.length === 1 ? 'job.referralOne' : 'job.referralMany'))}</span>
         ${linkedRefs.map(r => `
           <button type="button"
                   class="job-ref-chip"
                   data-action="scroll-to-ref"
                   data-ref-id="${r.id}"
                   data-status="${escapeHtml(r.status)}"
                   title="${escapeHtml(t('job.refChipTitle', { name: r.name }))}">
             <span class="job-ref-status-dot"></span>
             ${escapeHtml(r.name)}
           </button>
         `).join('')}
       </div>`
    : '';

  const closed = isClosed(job.status);
  const currentIdx = stepIndex(job.status);
  const pct = progressPct(job.status);

  const offerConfirmed = job.status === 'Offer' && job.offerConfirmed === true;

  const offerRibbon = (job.status === 'Offer' && !offerConfirmed)
    ? `<span class="job-offer-ribbon" aria-hidden="true">${escapeHtml(t('job.offerRibbon'))}</span>`
    : '';

  const confettiHtml = offerConfirmed ? renderConfetti() : '';
  const congratsBannerHtml = offerConfirmed
    ? `<div class="congrats-banner">
         <span class="congrats-emoji">🎉</span>
         <div class="congrats-text">
           <strong>${escapeHtml(t('job.offerConfirmed.title'))}</strong>
           <span>${escapeHtml(t('job.offerConfirmed.subtitle', { company: job.company }))}</span>
         </div>
       </div>`
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
    : renderOpenActions(job, currentIdx, offerConfirmed);

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

  const badgeHtml = offerConfirmed
    ? `<span class="badge badge-confirmed" data-status="Offer">✓ ${escapeHtml(tState(job.status))}</span>`
    : `<span class="badge" data-status="${escapeHtml(job.status)}">${escapeHtml(tState(job.status))}</span>`;

  return `
    <div class="job ${offerConfirmed ? 'offer-confirmed' : ''}"
         data-status="${escapeHtml(job.status)}"
         data-id="${job.id}"
         draggable="true"
         style="animation-delay:${Math.min(index * 40, 400)}ms">

      ${confettiHtml}
      <div class="drag-handle" title="${escapeHtml(t('job.dragHandle'))}">⠿</div>
      ${offerRibbon}

      <div class="job-header">
        <div class="job-info">
          <h3>${escapeHtml(roleDisplay)} <span class="company">· ${escapeHtml(job.company)}</span></h3>
          <div class="job-meta">${dateTxt}${daysTxt}${salaryTxt}${workModeTxt}${contactTxt}</div>
        </div>
        <div class="job-actions">
          <button class="action-btn" title="${escapeHtml(t('job.editTitle'))}" data-action="edit" aria-label="${escapeHtml(t('job.editTitle'))}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
          </button>
          <button class="action-btn danger" title="${escapeHtml(t('job.deleteTitle'))}" data-action="delete" aria-label="${escapeHtml(t('job.deleteTitle'))}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      ${notesTxt}
      ${linkTxt}
      ${congratsBannerHtml}
      ${badgeHtml}
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
// Salary: "💰 USD 3,000–4,000 · per hour"
// Supports legacy data where the salary already includes the
// currency code.
// ------------------------------------------------------------
function renderSalaryTag(job) {
  if (!job.salary) return '';

  const raw = String(job.salary).trim();
  if (!raw) return '';

  const hasCode = /^(ars|usd)\b/i.test(raw);
  const codePrefix = (job.currency && !hasCode)
    ? escapeHtml(String(job.currency).toUpperCase()) + ' '
    : '';

  const hourlyTxt = job.hourlySalary ? ' · ' + t('job.perHour') : '';

  return `<span>💰 ${codePrefix}${escapeHtml(raw)}${hourlyTxt}</span>`;
}

// ------------------------------------------------------------
// Work mode: "🏢 On-site" / "🏠 Remote" / "🔄 Hybrid · 3d"
// ------------------------------------------------------------
function renderWorkModeTag(job) {
  if (job.workMode === 'onsite') {
    return `<span>🏢 ${escapeHtml(t('workMode.onsite'))}</span>`;
  }
  if (job.workMode === 'remote') {
    return `<span>🏠 ${escapeHtml(t('workMode.remote'))}</span>`;
  }
  if (job.workMode === 'hybrid') {
    const days = Number(job.hybridOfficeDays) || 3;
    return `<span>🔄 ${escapeHtml(t('workMode.hybridShort', { n: days }))}</span>`;
  }
  return '';
}

// ------------------------------------------------------------
// SVG icons per platform (same look as the picker).
// ------------------------------------------------------------
const CONTACT_ICONS_SVG = {
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>`,
  email: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 6-10 7L2 6"/>
  </svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>`,
  other: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>`,
};

function buildContactHref(platform, link) {
  if (!link) return null;
  const raw = String(link).trim();
  if (!raw) return null;

  switch (platform) {
    case 'email':
      return raw.startsWith('mailto:') ? raw : `mailto:${raw}`;
    case 'whatsapp': {
      const digits = raw.replace(/[^\d]/g, '');
      return digits ? `https://wa.me/${digits}` : null;
    }
    case 'linkedin':
    case 'other':
    default:
      if (/^https?:\/\//i.test(raw)) return raw;
      if (/^[\w-]+(\.[\w-]+)+/.test(raw)) return 'https://' + raw;
      return raw;
  }
}

function renderContactChip(job) {
  const name = (job.contact || '').trim();
  const link = (job.contactLink || '').trim();

  // Neither name nor link → render nothing.
  if (!name && !link) return '';

  const platform = job.contactPlatform || 'other';
  const iconSvg = CONTACT_ICONS_SVG[platform] || CONTACT_ICONS_SVG.other;
  const href = link ? buildContactHref(platform, link) : null;

  // No link → plain text as before.
  if (!href) {
    return `<span>👤 ${escapeHtml(name || link)}</span>`;
  }

  // With link → clickable chip with SVG.
  const label = name || t('job.contactoContactar');
  return `<a href="${escapeHtml(href)}"
             class="job-contact-chip"
             target="_blank"
             rel="noopener"
             title="${escapeHtml(t('job.contactoAbrirTitle', { name: name || '' }))}">
    ${iconSvg}
    <span class="chip-name">${escapeHtml(label)}</span>
    <span class="chip-arrow">↗</span>
  </a>`;
}

function renderConfetti() {
  return `
    <div class="job-confetti" aria-hidden="true">
      <span class="confetti-piece c1"></span>
      <span class="confetti-piece c2"></span>
      <span class="confetti-piece c3"></span>
      <span class="confetti-piece c4"></span>
      <span class="confetti-piece c5"></span>
      <span class="confetti-piece c6"></span>
      <span class="confetti-piece c7"></span>
    </div>
  `;
}

function renderOpenActions(job, currentIdx, offerConfirmed = false) {
  if (offerConfirmed) {
    return `
      <div class="wf-section">
        <div class="wf-section-label">${escapeHtml(t('job.offerConfirmed.label'))}</div>
        <div class="wf-main-actions">
          <div class="offer-confirmed-pill">
            <span class="pill-emoji">🏆</span>
            <span>${escapeHtml(t('job.offerConfirmed.status'))}</span>
          </div>
        </div>
        <div class="wf-close-actions">
          <button class="wf-close-btn" data-action="unconfirm-offer">
            ↺ ${escapeHtml(t('job.unconfirmOffer'))}
          </button>
        </div>
      </div>
    `;
  }

  const canBack = currentIdx > 0;
  const canNext = currentIdx < WORKFLOW_STEPS.length - 1;
  const prevStep = canBack ? WORKFLOW_STEPS[currentIdx - 1] : null;
  const nextStep = canNext ? WORKFLOW_STEPS[currentIdx + 1] : null;
  const isOffer = job.status === 'Offer';
  const alreadyWentBack = Boolean(job.wentBack);

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
    ? `<button class="wf-close-btn offer" data-action="close" data-status="Offer">${escapeHtml(t('job.closeOffer'))}</button>`
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
        <button class="wf-close-btn reject" data-action="close" data-status="Rejected">${escapeHtml(t('job.closeRejected'))}</button>
        <button class="wf-close-btn"        data-action="close" data-status="Ghosted">${escapeHtml(t('job.closeGhosted'))}</button>
        <button class="wf-close-btn"        data-action="close" data-status="Discarded">${escapeHtml(t('job.closeDiscarded'))}</button>
      </div>
    </div>
  `;
}

function renderClosedActions(job) {
  const last = lastHistoryEntry(job);
  const reasonTxt = last && last.reason
    ? `<div class="closed-banner-reason">"${escapeHtml(last.reason)}"</div>`
    : '';
  const date = last && last.date
    ? ` · ${escapeHtml(t('job.closedOn'))} ${formatDate(last.date.slice(0, 10))}`
    : '';

  return `
    <div class="closed-banner" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;flex-wrap:wrap;">
        <div class="text">
          ${escapeHtml(t('job.closedLabel'))} <strong>${escapeHtml(tState(job.status))}</strong>${date}
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