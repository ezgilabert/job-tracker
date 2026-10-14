// ============================================================
// Modal: Referral → Application
//
// Two flows:
//   "new"  → create a pre-filled application and open its Edit
//            modal so the user can complete the missing fields.
//   "link" → pick an existing application and store its id on
//            the referral as `linkedJobId`.
// ============================================================

import { showToast } from '../../ui/feedback/toast.js';
import { createModal } from '../../ui/modal.js';
import { escapeHtml, todayISO } from '../../app/utils.js';
import { t, tState } from '../../i18n/index.js';
import { scrollToJob } from '../../app/events.js';

export function mountRefToJobModal(jobsStore, refsStore, editJob) {
  const linkSection = document.getElementById('refToJobLinkSection');
  const listEl = document.getElementById('refToJobList');
  const confirmBtn = document.getElementById('refToJobConfirm');
  const nameEl = document.getElementById('refToJobName');

  let pendingRefId = null;
  let mode = null;
  let selectedJobId = null;

  const modal = createModal(document.getElementById('refToJobModal'), {
    onClose: () => {
      pendingRefId = null;
      mode = null;
      selectedJobId = null;
    },
  });

  function open(refId) {
    const r = refsStore.get().find(x => x.id === refId);
    if (!r) return;

    pendingRefId = refId;
    mode = null;
    selectedJobId = null;

    nameEl.textContent = r.name;
    linkSection.classList.add('is-hidden');
    confirmBtn.classList.add('is-hidden');
    document.querySelectorAll('.ref-to-job-option').forEach(o => o.classList.remove('selected'));

    modal.open();
  }

  document.getElementById('refToJobSkip')
    .addEventListener('click', () => modal.close());

  document.querySelectorAll('.ref-to-job-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.ref-to-job-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      mode = opt.dataset.mode;

      if (mode === 'new') {
        const r = refsStore.get().find(x => x.id === pendingRefId);
        if (r) createJobFromRef(r);
        modal.close();
      } else if (mode === 'link') {
        renderList();
        linkSection.classList.remove('is-hidden');
        confirmBtn.classList.remove('is-hidden');
      }
    });
  });

  function renderList() {
    const jobs = jobsStore.get();
    const r = refsStore.get().find(x => x.id === pendingRefId);

    if (jobs.length === 0) {
      listEl.innerHTML =
        `<div class="ref-to-job-empty">${escapeHtml(t('empty.refToJob'))}</div>`;
      confirmBtn.disabled = true;
      return;
    }

    listEl.innerHTML = jobs.map(j => {
      const isSelected = selectedJobId === j.id;
      const alreadyLinked = r?.linkedJobId === j.id;
      return `
        <button type="button"
                class="ref-to-job-item ${isSelected ? 'selected' : ''}"
                data-job-id="${j.id}">
          <div class="info">
            <strong>${escapeHtml(j.role)}</strong>
            <span>${escapeHtml(j.company)}${alreadyLinked ? ' · ' + escapeHtml(t('refToJob.alreadyLinked')) : ''}</span>
          </div>
          <span class="status-mini">${escapeHtml(tState(j.status))}</span>
        </button>
      `;
    }).join('');

    confirmBtn.disabled = !selectedJobId;
  }

  listEl.addEventListener('click', (e) => {
    const item = e.target.closest('.ref-to-job-item');
    if (!item) return;
    selectedJobId = Number(item.dataset.jobId);
    listEl.querySelectorAll('.ref-to-job-item').forEach(i =>
      i.classList.toggle('selected', i === item)
    );
    confirmBtn.disabled = false;
  });

  confirmBtn.addEventListener('click', () => {
    if (mode !== 'link' || !selectedJobId || !pendingRefId) return;
    const j = jobsStore.get().find(x => x.id === selectedJobId);
    if (!j) return;

    refsStore.update(refs => refs.map(r => {
      if (r.id !== pendingRefId) return r;
      return { ...r, linkedJobId: j.id };
    }));

    modal.close();
    showToast(t('toast.linkedTo', { company: j.company }), 'icon-chain');
    scrollToJob(j.id);
  });

  // ----------------------------------------------------------
  // "Create new application" flow
  // ----------------------------------------------------------
  function createJobFromRef(r) {
    const newId = Date.now();
    const newJob = {
      id: newId,
      company: '—',
      role: '',
      date: todayISO(),
      status: 'Contact',
      link: '',
      salary: '',
      salaryIsRange: true,
      currency: 'usd',
      workMode: '',
      hybridOfficeDays: null,
      contact: r.name + (r.role ? ` (${r.role})` : ''),
      contactLink: '',
      contactPlatform: 'linkedin',
      notes: `Referred by ${r.name}${r.notes ? '. ' + r.notes : ''}`,
      skipped: [],
      wentBack: false,
      history: [{
        status: 'Contact',
        date: new Date().toISOString(),
        reason: `Referral: ${r.name}`,
      }],
    };

    jobsStore.update(jobs => [newJob, ...jobs]);

    refsStore.update(refs => refs.map(x => {
      if (x.id !== r.id) return x;
      return { ...x, linkedJobId: newId };
    }));

    showToast(t('toast.jobCreatedFromRef', { name: r.name }), 'icon-sparkle');

    setTimeout(() => {
      editJob.open(newId);
      scrollToJob(newId);
    }, 400);
  }

  return { open, close: () => modal.close() };
}