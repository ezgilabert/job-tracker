// ============================================================
// Template: job card
// ============================================================

import { WORKFLOW_STEPS } from '../app/constants.js';
import {
  isClosed, stepIndex, progressPct,
  currentStepNote, lastHistoryEntry, refsForJob,
} from '../app/selectors.js';
import { escapeHtml, daysSince, formatDate, ensureArray } from '../app/utils.js';
import { renderSteps } from './steps.js';
import { icon } from './icon.js';
import { t, tState, tStateShort } from '../i18n/index.js';

/**
 * @param {object} job
 * @param {{ referrals: object[], index?: number }} ctx
 * @returns {string} HTML
 */
export function renderJobCard(job, ctx = {}) {
  const { referrals = [], index = 0 } = ctx;

  const days = daysSince(job.date);
  const daysTxt = days !== null
    ? `<span>${icon('icon-clock')}${escapeHtml(t(days === 1 ? 'job.daysAgoOne' : 'job.daysAgoMany', { n: days }))}</span>`
    : '';
  const dateTxt = job.date ? `<span>${icon('icon-calendar')}${escapeHtml(formatDate(job.date))}</span>` : '';
  const salaryTxt = renderSalaryTag(job);
  const workModeTxt = renderWorkModeTag(job);
  const contactTxt = renderContactChip(job);
  const linkTxt = job.link
    ? `<a href="${escapeHtml(job.link)}" target="_blank" rel="noopener">${escapeHtml(t('job.viewOffer'))}${icon('icon-external-link')}</a>`
    : '';
  const notesTxt = job.notes
    ? `<div class="job-notes">${escapeHtml(job.notes)}</div>`
    : '';

  const roleDisplay = job.role || t('job.noRole');

  // Refs are matched by `linkedJobId` — the "Referral → Application"
  // flow writes to that field, not to the legacy `linkedCompanies`.
  const linkedRefs = refsForJob(referrals, job.id);
  const refsHtml = linkedRefs.length
    ? `<div class="job-refs">
         <span class="job-refs-label">
           ${icon('icon-users')}
           <span>${escapeHtml(t(linkedRefs.length === 1 ? 'job.referralOne' : 'job.referralMany'))}</span>
         </span>
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
         <span class="congrats-emoji" aria-hidden="true">${icon('icon-star')}</span>
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
        ${icon('icon-clock')}
        <span>${escapeHtml(t('job.history'))} · <strong>${currentIdx + 1}/${WORKFLOW_STEPS.length}</strong> ${escapeHtml(t('job.historyStages'))}</span>
      </button>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
  `;

  const badgeHtml = offerConfirmed
    ? `<span class="badge badge-confirmed" data-status="Offer">${escapeHtml(tState(job.status))}</span>`
    : `<span class="badge" data-status="${escapeHtml(job.status)}">${escapeHtml(tState(job.status))}</span>`;

  return `
    <div class="job ${offerConfirmed ? 'offer-confirmed' : ''}"
         data-status="${escapeHtml(job.status)}"
         data-id="${job.id}"
         draggable="true"
         style="animation-delay:${Math.min(index * 40, 400)}ms">

      ${confettiHtml}
      <div class="drag-handle" title="${escapeHtml(t('job.dragHandle'))}">${icon('icon-grip-vertical')}</div>
      ${offerRibbon}

      <div class="job-header">
        <div class="job-info">
          <h3>${escapeHtml(roleDisplay)} <span class="company">· ${escapeHtml(job.company)}</span></h3>
          <div class="job-meta">${dateTxt}${daysTxt}${salaryTxt}${workModeTxt}${contactTxt}</div>
        </div>
        <div class="job-actions">
          <button class="action-btn" title="${escapeHtml(t('job.editTitle'))}" data-action="edit" aria-label="${escapeHtml(t('job.editTitle'))}">
            ${icon('icon-pencil')}
          </button>
          <button class="action-btn danger" title="${escapeHtml(t('job.deleteTitle'))}" data-action="delete" aria-label="${escapeHtml(t('job.deleteTitle'))}">
            ${icon('icon-trash')}
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

  return `<span>${icon('icon-dollar')}${codePrefix}${escapeHtml(raw)}${hourlyTxt}</span>`;
}

// ------------------------------------------------------------
// Work mode: "🏢 On-site" / "🏠 Remote" / "🔄 Hybrid · 3d"
// ------------------------------------------------------------
function renderWorkModeTag(job) {
  if (job.workMode === 'onsite') {
    return `<span>${icon('icon-building')}${escapeHtml(t('workMode.onsite'))}</span>`;
  }
  if (job.workMode === 'remote') {
    return `<span>${icon('icon-home')}${escapeHtml(t('workMode.remote'))}</span>`;
  }
  if (job.workMode === 'hybrid') {
    const days = Number(job.hybridOfficeDays) || 3;
    return `<span>${icon('icon-refresh-cw')}${escapeHtml(t('workMode.hybridShort', { n: days }))}</span>`;
  }
  return '';
}

// ------------------------------------------------------------
// Contact platform → sprite id
// ------------------------------------------------------------
const CONTACT_SPRITE_ID = {
  linkedin: 'icon-linkedin',
  email:    'icon-email',
  whatsapp: 'icon-whatsapp',
  other:    'icon-chain',
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

  if (!name && !link) return '';

  const platform = job.contactPlatform || 'other';
  const spriteId = CONTACT_SPRITE_ID[platform] || 'icon-chain';
  const href = link ? buildContactHref(platform, link) : null;

  if (!href) {
    return `<span>${icon('icon-account')}${escapeHtml(name || link)}</span>`;
  }

  const label = name || t('job.contactoContactar');
  return `<a href="${escapeHtml(href)}"
             class="job-contact-chip"
             target="_blank"
             rel="noopener"
             title="${escapeHtml(t('job.contactoAbrirTitle', { name: name || '' }))}">
    ${icon(spriteId)}
    <span class="chip-name">${escapeHtml(label)}</span>
    <span class="chip-arrow">${icon('icon-external-link')}</span>
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
            ${icon('icon-trophy')}
            <span>${escapeHtml(t('job.offerConfirmed.status'))}</span>
          </div>
        </div>
        <div class="wf-close-actions">
          <button class="wf-close-btn" data-action="unconfirm-offer">
            ${icon('icon-rotate-ccw')}
            <span>${escapeHtml(t('job.unconfirmOffer'))}</span>
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
          <button class="status-clickable" data-action="history" title="${escapeHtml(t('job.historyTitle'))}">
            ${icon('icon-clock')}
            <span>${escapeHtml(t('job.history'))}</span>
          </button>
          <button class="wf-btn-secondary" data-action="reopen">${escapeHtml(t('job.reopen'))}</button>
        </div>
      </div>
      ${reasonTxt}
    </div>
  `;
}