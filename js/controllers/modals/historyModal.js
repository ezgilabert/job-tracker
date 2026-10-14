// ============================================================
// Modal: History timeline for jobs and referrals.
//
// Two timelines share the same markup structure, so they live
// together in this module. Both use the shared createModal
// lifecycle and its Escape stack handles priority when both are
// opened in sequence.
// ============================================================

import { createModal } from '../../ui/modal.js';
import {
  getStateIcon, getRefStateIcon,
} from '../../app/constants.js';
import { isClosed } from '../../app/selectors.js';
import { escapeHtml, ensureArray, formatDateTime } from '../../app/utils.js';
import {
  t, tState, tRefState,
} from '../../i18n/index.js';
import { icon } from '../../app/icons.js';

export function mountHistoryModal(jobsStore, refsStore) {
  // ---------- Jobs ----------
  const jobsSubtitle = document.getElementById('historySubtitle');
  const jobsTimeline = document.getElementById('historyTimeline');
  const jobsSkipped = document.getElementById('historySkipped');
  const jobsSkippedList = document.getElementById('historySkippedList');

  const jobsModal = createModal(document.getElementById('historyModal'));

  function openJob(id) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;

    jobsSubtitle.innerHTML =
      `<strong>${escapeHtml(j.role)}</strong> · ${escapeHtml(j.company)}`;

    const history = ensureArray(j.history);
    const lastIdx = history.length - 1;

    if (history.length === 0) {
      jobsTimeline.innerHTML =
        `<div class="history-empty">${escapeHtml(t('hist.empty'))}</div>`;
    } else {
      jobsTimeline.innerHTML = history.map((entry, i) => {
        const isCurrent = i === lastIdx && !isClosed(entry.status);
        const isClosedEntry = isClosed(entry.status);
        const isBackward = Boolean(entry.wentBack);

        let itemClass = 'history-item';
        if (isCurrent) itemClass += ' current';
        if (isBackward) itemClass += ' went-back';
        if (isClosedEntry) itemClass += ' closed-' + entry.status.toLowerCase().replace(/\s+/g, '-');

        let tagsHtml = '';
        if (isCurrent) tagsHtml += `<span class="history-tag current">${escapeHtml(t('hist.current'))}</span>`;
        if (isBackward) tagsHtml += `<span class="history-tag went-back">${escapeHtml(t('hist.backward'))}</span>`;
        if (isClosedEntry && entry.status !== 'Offer') {
          tagsHtml += `<span class="history-tag closed">${escapeHtml(t('hist.closed'))}</span>`;
        }
        if (entry.status === 'Offer') {
          tagsHtml += `<span class="history-tag offer">${escapeHtml(t('hist.offer'))}</span>`;
        }

        const reasonHtml = entry.reason
          ? `<div class="history-reason">"${escapeHtml(entry.reason)}"</div>`
          : '';
        const noteHtml = entry.note
          ? `<div class="history-note"><strong>${escapeHtml(t('hist.note'))}</strong>${escapeHtml(entry.note)}</div>`
          : '';

        return `
          <div class="${itemClass}">
            <div class="history-dot">${icon(getStateIcon(entry.status))}</div>
            <div class="history-content">
              <div class="history-status">
                ${escapeHtml(tState(entry.status))}
                ${tagsHtml}
              </div>
              <div class="history-date">${formatDateTime(entry.date)}</div>
              ${reasonHtml}
              ${noteHtml}
            </div>
          </div>
        `;
      }).join('');
    }

    const skipped = ensureArray(j.skipped);
    if (skipped.length) {
      jobsSkipped.classList.remove('is-hidden');
      jobsSkippedList.innerHTML = skipped
        .map(s => `<span class="history-skipped-tag">${escapeHtml(tState(s))}</span>`)
        .join('');
    } else {
      jobsSkipped.classList.add('is-hidden');
    }

    jobsModal.open();
  }

  document.getElementById('closeHistoryBtn')
    .addEventListener('click', () => jobsModal.close());
  document.getElementById('closeHistoryModal')
    .addEventListener('click', () => jobsModal.close());

  // ---------- Referrals ----------
  const refSubtitle = document.getElementById('refHistorySubtitle');
  const refTimeline = document.getElementById('refHistoryTimeline');

  const refModal = createModal(document.getElementById('refHistoryModal'));

  function openRef(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;

    refSubtitle.innerHTML =
      `<strong>${escapeHtml(r.name)}</strong>` +
      (r.role ? ` · ${escapeHtml(r.role)}` : '');

    const history = ensureArray(r.history);
    const lastIdx = history.length - 1;

    if (history.length === 0) {
      refTimeline.innerHTML =
        `<div class="history-empty">${escapeHtml(t('hist.empty'))}</div>`;
    } else {
      refTimeline.innerHTML = history.map((entry, i) => {
        const isCurrent = i === lastIdx && entry.status !== 'Not Applicable';
        const isClosedEntry = entry.status === 'Not Applicable';
        const isBackward = Boolean(entry.wentBack);

        let itemClass = 'history-item';
        if (isCurrent) itemClass += ' current';
        if (isBackward) itemClass += ' went-back';
        if (isClosedEntry) itemClass += ' closed-rejected';

        let tagsHtml = '';
        if (isCurrent) tagsHtml += `<span class="history-tag current">${escapeHtml(t('hist.current'))}</span>`;
        if (isBackward) tagsHtml += `<span class="history-tag went-back">${escapeHtml(t('hist.backward'))}</span>`;
        if (isClosedEntry) tagsHtml += `<span class="history-tag closed">${escapeHtml(t('hist.closedRef'))}</span>`;

        const reasonHtml = entry.reason
          ? `<div class="history-reason">"${escapeHtml(entry.reason)}"</div>`
          : '';
        const noteHtml = entry.note
          ? `<div class="history-note"><strong>${escapeHtml(t('hist.note'))}</strong>${escapeHtml(entry.note)}</div>`
          : '';

        return `
          <div class="${itemClass}">
            <div class="history-dot">${icon(getRefStateIcon(entry.status))}</div>
            <div class="history-content">
              <div class="history-status">
                ${escapeHtml(tRefState(entry.status))}
                ${tagsHtml}
              </div>
              <div class="history-date">${formatDateTime(entry.date)}</div>
              ${reasonHtml}
              ${noteHtml}
            </div>
          </div>
        `;
      }).join('');
    }

    refModal.open();
  }

  document.getElementById('closeRefHistoryBtn')
    .addEventListener('click', () => refModal.close());
  document.getElementById('closeRefHistoryModal')
    .addEventListener('click', () => refModal.close());

  return {
    openJob,
    openRef,
    closeJob: () => jobsModal.close(),
    closeRef: () => refModal.close(),
  };
}