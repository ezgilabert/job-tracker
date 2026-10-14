// ============================================================
// Controller: modals
// ============================================================

import { showToast } from '../ui/feedback/toast.js';
import { showConfirm } from '../ui/feedback/confirmModal.js';
import { DatePicker } from '../ui/form/datePicker.js';
import { RoleCombo } from '../ui/form/combo.js';
import { WorkModePicker } from '../ui/form/workModePicker.js';
import { CurrencyPicker } from '../ui/form/currencyPicker.js';
import { SalaryModeChip } from '../ui/form/salaryModeChip.js';
import { SalaryInput } from '../ui/form/salaryInput.js';
import { ContactLinkPicker } from '../ui/form/contactLinkPicker.js';
import { mountChips } from '../ui/form/chips.js';
import { createModal } from '../ui/modal.js';
import {
  CLOSE_REASON_KEYS, WORKFLOW_STEPS,
  getStateIcon, getRefStateIcon,
} from '../app/constants.js';
import { stepIndex, isClosed } from '../app/selectors.js';
import {
  escapeHtml, todayISO, cloneArray, ensureArray,
  formatDateTime, valueOf, setVal, updateById, withHistoryEntry,
} from '../app/utils.js';
import {
  t, tState, tStateShort, tRefState, tRefStateShort,
} from '../i18n/index.js';
import { scrollToJob, onScrollToJob, onI18nChanged } from '../app/events.js';
import { withUndo } from '../app/undo.js';
import { icon } from '../app/icons.js';

const CLOSE_UNDO_ICON = {
  Rejected:  'icon-x-circle',
  Ghosted:   'icon-ghost',
  Discarded: 'icon-ban',
  Offer:     'icon-trophy',
};

/**
 * @param {import('../app/store.js').Store} jobsStore
 * @param {import('../app/store.js').Store} refsStore
 * @param {import('../app/store.js').Store} configStore
 * @param {{ requestNewRole: (suggested:string)=>Promise<string|null> }} createRoleCtrl
 */
export function mountModalsController(jobsStore, refsStore, configStore, createRoleCtrl) {
  // ----------------------------------------------------------
  // Edit job
  // ----------------------------------------------------------
  const editStatusEl = document.getElementById('editStatus');
  const editStatusIcon = editStatusEl
    ? editStatusEl.querySelector('[data-status-icon]')
    : null;
  const editStatusText = editStatusEl
    ? editStatusEl.querySelector('[data-status-text]')
    : null;

  function updateEditStatusDisplay(status) {
    if (editStatusIcon) editStatusIcon.innerHTML = icon(getStateIcon(status));
    if (editStatusText) editStatusText.textContent = tState(status);
  }

  const editHourlySalaryCheckbox = document.getElementById('editHourlySalary');

  let editingId = null;

  const editModal = createModal(document.getElementById('editModal'), {
    onClose: () => { editingId = null; },
  });

  const editDate = new DatePicker(document.getElementById('editDatePicker'));
  const editRole = new RoleCombo(document.getElementById('editRoleCombo'), {
    getJobRoles: () => jobsStore.get().map(j => j.role),
    getConfig: () => configStore.get(),
    onCreateRequested: (suggested) => createRoleCtrl.requestNewRole(suggested),
  });
  const editWorkMode = new WorkModePicker(
    document.getElementById('editWorkModePicker'),
    {
      hybridWrap: document.getElementById('editHybridDaysWrap'),
      hybridSelect: document.getElementById('editHybridOfficeDays'),
    }
  );
  const editCurrency = new CurrencyPicker(
    document.getElementById('editSalaryCurrencyChip'),
    { value: 'usd' }
  );

  const editSalaryLabelEl = document.querySelector('#editModal .field [data-salary-label]');

  const editSalaryMode = new SalaryModeChip(
    document.getElementById('editSalaryModeChip'),
    {
      value: 'range',
      fieldLabelEl: editSalaryLabelEl,
    }
  );

  const editSalaryInput = new SalaryInput(
    document.getElementById('editSalary'),
    document.getElementById('editSalaryHint'),
    {
      getMode: () => editSalaryMode.getValue(),
      getCurrency: () => editCurrency.getValue(),
      getHourly: () => editHourlySalaryCheckbox.checked,
    }
  );

  editCurrency.onChange = () => editSalaryInput.reset();
  editSalaryMode.onChange = () => editSalaryInput.reset();
  editHourlySalaryCheckbox.addEventListener('change', () => editSalaryInput.reset());

  const editContactLinkPicker = new ContactLinkPicker(
    document.getElementById('editContactLinkPicker'),
    { value: { platform: 'linkedin', link: '' } }
  );
  editContactLinkPicker.translate = t;

  function openEdit(id) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;
    editingId = id;

    setVal('editCompany', j.company);
    setVal('editRole', j.role);
    editDate.setValue(j.date || '');
    updateEditStatusDisplay(j.status);
    setVal('editLink', j.link || '');
    editHourlySalaryCheckbox.checked = Boolean(j.hourlySalary);
    editCurrency.setValue(j.currency || 'usd');
    editSalaryMode.setValue(j.salaryIsRange === false ? 'single' : 'range');
    editSalaryInput.setValue(j.salary || '');
    setVal('editContact', j.contact || '');
    editContactLinkPicker.setValue({
      platform: j.contactPlatform || 'linkedin',
      link: j.contactLink || '',
    });
    setVal('editNotes', j.notes || '');
    editWorkMode.setValue(j.workMode || '', j.hybridOfficeDays || 3);

    editModal.open();
  }

  document.getElementById('cancelEdit').addEventListener('click', () => editModal.close());

  document.getElementById('saveEdit').addEventListener('click', () => {
    if (!editingId) return;

    const contactValidation = editContactLinkPicker.validate();
    if (!contactValidation.valid) {
      editContactLinkPicker.markTouched();
      editContactLinkPicker.focus();
      showToast(t(contactValidation.errorKey), '!');
      return;
    }

    const mode = editWorkMode.getValue();
    const salaryMode = editSalaryMode.getValue();
    const contactData = editContactLinkPicker.getValue();

    jobsStore.update(jobs => jobs.map(j => {
      if (j.id !== editingId) return j;
      return {
        ...j,
        company:  valueOf('editCompany'),
        role:     valueOf('editRole'),
        date:     editDate.getValue(),
        link:     valueOf('editLink'),
        salary:   editSalaryInput.getValue(),
        hourlySalary: editHourlySalaryCheckbox.checked,
        salaryIsRange: salaryMode === 'range',
        currency: editCurrency.getValue(),
        workMode: mode.workMode,
        hybridOfficeDays: mode.hybridOfficeDays,
        contact:  valueOf('editContact'),
        contactLink: contactData.link,
        contactPlatform: contactData.platform,
        notes:    valueOf('editNotes'),
      };
    }));

    editModal.close();
    showToast(t('modal.saveChanges'), 'icon-check');
  });

  // ----------------------------------------------------------
  // Close job with reason
  // ----------------------------------------------------------
  const closeReasonsEl = document.getElementById('closeReasons');
  const closeReasonInput = document.getElementById('closeReason');
  let pendingClose = null;

  const closeModal = createModal(document.getElementById('closeModal'), {
    onClose: () => { pendingClose = null; },
  });

  function openClose(id, status) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;
    pendingClose = { id, status };

    document.getElementById('closeModalTitle').textContent =
      t('close.titleAs', { status: tState(status) });
    document.getElementById('closeModalSubtitle').innerHTML =
      `<strong>${escapeHtml(j.role)}</strong> · ${escapeHtml(j.company)}`;

    const reasonKeys = CLOSE_REASON_KEYS[status] || [];
    closeReasonsEl.innerHTML = reasonKeys
      .map(key => {
        const label = t(key);
        return `<button type="button" class="close-reason-chip" data-reason="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
      })
      .join('');

    closeReasonInput.value = '';
    closeReasonInput.style.borderColor = '';
    closeReasonInput.style.boxShadow = '';

    closeModal.open();
    setTimeout(() => closeReasonInput.focus(), 100);
  }

  closeReasonsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.close-reason-chip');
    if (!chip) return;
    closeReasonsEl.querySelectorAll('.close-reason-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    closeReasonInput.value = chip.dataset.reason;
    closeReasonInput.focus();
  });

  closeReasonInput.addEventListener('input', () => {
    closeReasonInput.style.borderColor = '';
    closeReasonInput.style.boxShadow = '';
  });

  document.getElementById('cancelClose').addEventListener('click', () => closeModal.close());

  document.getElementById('confirmClose').addEventListener('click', () => {
    if (!pendingClose) return;
    const reason = closeReasonInput.value.trim();
    if (!reason) {
      closeReasonInput.focus();
      closeReasonInput.style.borderColor = 'var(--danger)';
      closeReasonInput.style.boxShadow = '0 0 0 3px var(--danger-soft)';
      showToast(t('toast.needReason'), '!');
      return;
    }

    const { id, status } = pendingClose;
    const closedJob = jobsStore.get().find(x => x.id === id);

    withUndo(
      [jobsStore, refsStore],
      t('toast.closedAs', { status: tState(status) }),
      () => {
        updateById(jobsStore, id, j => withHistoryEntry(
          j,
          status === 'Offer'
            ? { status, offerConfirmed: true }
            : { status },
          { status, reason }
        ));

        if (status === 'Offer') {
          syncLinkedRefToHired(id, closedJob);
        }
      },
      CLOSE_UNDO_ICON[status] || 'icon-check'
    );

    closeModal.close();
  });

  function syncLinkedRefToHired(jobId, job) {
    refsStore.update(refs => refs.map(r => {
      if (r.linkedJobId !== jobId) return r;
      if (r.status === 'Not Applicable') return r;
      if (r.status === 'Hired') return r;

      const label = job
        ? `${job.role || '—'} · ${job.company || '—'}`
        : '—';
      return withHistoryEntry(
        r,
        { status: 'Hired' },
        { status: 'Hired', reason: `Offer accepted: ${label}` }
      );
    }));
  }

  // ----------------------------------------------------------
  // History (jobs)
  // ----------------------------------------------------------
  const historySubtitle = document.getElementById('historySubtitle');
  const historyTimeline = document.getElementById('historyTimeline');
  const historySkipped = document.getElementById('historySkipped');
  const historySkippedList = document.getElementById('historySkippedList');

  const historyModal = createModal(document.getElementById('historyModal'));

  function openHistory(id) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;

    historySubtitle.innerHTML =
      `<strong>${escapeHtml(j.role)}</strong> · ${escapeHtml(j.company)}`;

    const history = ensureArray(j.history);
    const lastIdx = history.length - 1;

    if (history.length === 0) {
      historyTimeline.innerHTML = `<div class="history-empty">${escapeHtml(t('hist.empty'))}</div>`;
    } else {
      historyTimeline.innerHTML = history.map((entry, i) => {
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
      historySkipped.classList.remove('is-hidden');
      historySkippedList.innerHTML = skipped
        .map(s => `<span class="history-skipped-tag">${escapeHtml(tState(s))}</span>`)
        .join('');
    } else {
      historySkipped.classList.add('is-hidden');
    }

    historyModal.open();
  }

  document.getElementById('closeHistoryBtn').addEventListener('click', () => historyModal.close());
  document.getElementById('closeHistoryModal').addEventListener('click', () => historyModal.close());

  // ----------------------------------------------------------
  // History (referrals)
  // ----------------------------------------------------------
  const refHistorySubtitle = document.getElementById('refHistorySubtitle');
  const refHistoryTimeline = document.getElementById('refHistoryTimeline');

  const refHistoryModal = createModal(document.getElementById('refHistoryModal'));

  function openRefHistory(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;

    refHistorySubtitle.innerHTML =
      `<strong>${escapeHtml(r.name)}</strong>` +
      (r.role ? ` · ${escapeHtml(r.role)}` : '');

    const history = ensureArray(r.history);
    const lastIdx = history.length - 1;

    if (history.length === 0) {
      refHistoryTimeline.innerHTML =
        `<div class="history-empty">${escapeHtml(t('hist.empty'))}</div>`;
    } else {
      refHistoryTimeline.innerHTML = history.map((entry, i) => {
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

    refHistoryModal.open();
  }

  document.getElementById('closeRefHistoryBtn').addEventListener('click', () => refHistoryModal.close());
  document.getElementById('closeRefHistoryModal').addEventListener('click', () => refHistoryModal.close());

  // ----------------------------------------------------------
  // Note on advance (jobs)
  // ----------------------------------------------------------
  const stepNoteInput = document.getElementById('stepNoteInput');
  const noteSubtitle = document.getElementById('noteModalSubtitle');
  let pendingAdvance = null;

  const noteModal = createModal(document.getElementById('noteModal'), {
    onClose: () => { pendingAdvance = null; },
  });

  function openNote(id, direction, opts = {}) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;

    const idx = stepIndex(j.status);
    if (idx < 0) return;

    const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= WORKFLOW_STEPS.length) return;

    const nextStatus = WORKFLOW_STEPS[nextIdx].id;
    pendingAdvance = { id, nextStatus, skipCurrent: !!opts.skipCurrent, direction };

    noteSubtitle.innerHTML = t('note.subtitle', {
      step: escapeHtml(tStateShort(nextStatus)),
      name: escapeHtml(j.company),
    });

    stepNoteInput.value = '';
    noteModal.open();
    setTimeout(() => stepNoteInput.focus(), 80);
  }

  function applyAdvance({ note } = {}) {
    if (!pendingAdvance) return;
    const { id, nextStatus, skipCurrent } = pendingAdvance;
    const j = jobsStore.get().find(x => x.id === id);
    const name = j?.company ?? '';

    withUndo(
      jobsStore,
      t('toast.advanceTo', { name, status: tState(nextStatus) }),
      () => {
        updateById(jobsStore, id, job => {
          const skipped = cloneArray(job.skipped);
          if (skipCurrent && !skipped.includes(job.status)) skipped.push(job.status);

          return withHistoryEntry(
            job,
            { status: nextStatus, skipped },
            note ? { status: nextStatus, note } : { status: nextStatus }
          );
        });
      },
      skipCurrent ? 'icon-ban' : 'icon-arrow-right'
    );
  }

  document.getElementById('skipNote').addEventListener('click', () => {
    applyAdvance({ note: null });
    noteModal.close();
  });

  document.getElementById('saveNote').addEventListener('click', () => {
    applyAdvance({ note: stepNoteInput.value.trim() || null });
    noteModal.close();
  });

  // Closing via the X, overlay click, or Escape cancels the
  // advance. The user must press Skip or Save to move the job.
  document.getElementById('closeNoteModal').addEventListener('click', () => noteModal.close());

  // ----------------------------------------------------------
  // Edit referral
  // ----------------------------------------------------------
  let refEditingId = null;

  const refEditModal = createModal(document.getElementById('refEditModal'), {
    onClose: () => { refEditingId = null; },
  });

  const refEditRelationship = mountChips(
    document.getElementById('refEditRelationshipChips'),
    { onChange: () => {}, allowMultiple: true }
  );
  const refEditStatus = mountChips(
    document.getElementById('refEditStatusChips'),
    { onChange: () => {} }
  );

  function openRefEdit(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    refEditingId = id;

    setVal('refEditName', r.name);
    setVal('refEditRole', r.role || '');
    setVal('refEditContact', r.contact || '');
    setVal('refEditLink', r.link || '');
    setVal('refEditNotes', r.notes || '');

    const relationshipValue = Array.isArray(r.relationship)
      ? r.relationship
      : (r.relationship ? [r.relationship] : []);
    refEditRelationship.setValue(relationshipValue);

    refEditStatus.setValue(r.status || 'Pending');

    refEditModal.open();
  }

  document.getElementById('refCancelEdit').addEventListener('click', () => refEditModal.close());

  document.getElementById('refSaveEdit').addEventListener('click', () => {
    if (!refEditingId) return;

    const relationshipValue = refEditRelationship.getValue() || [];

    refsStore.update(refs => refs.map(r => {
      if (r.id !== refEditingId) return r;
      return {
        ...r,
        name:    valueOf('refEditName'),
        role:    valueOf('refEditRole'),
        contact: valueOf('refEditContact'),
        link:    valueOf('refEditLink'),
        relationship: Array.isArray(relationshipValue) ? relationshipValue : [],
        status:  refEditStatus.getValue() || 'Pending',
        notes:   valueOf('refEditNotes'),
      };
    }));

    refEditModal.close();
    showToast(t('toast.refUpdated'), 'icon-check');
  });

  // ----------------------------------------------------------
  // Move referral → applications
  // ----------------------------------------------------------
  const refToJobLinkSection = document.getElementById('refToJobLinkSection');
  const refToJobList = document.getElementById('refToJobList');
  const refToJobConfirm = document.getElementById('refToJobConfirm');
  let refToJobPending = null;
  let refToJobMode = null;
  let refToJobSelectedId = null;

  const refToJobModal = createModal(document.getElementById('refToJobModal'), {
    onClose: () => {
      refToJobPending = null;
      refToJobMode = null;
      refToJobSelectedId = null;
    },
  });

  function openRefToJob(refId) {
    const r = refsStore.get().find(x => x.id === refId);
    if (!r) return;

    refToJobPending = refId;
    refToJobMode = null;
    refToJobSelectedId = null;

    document.getElementById('refToJobName').textContent = r.name;
    refToJobLinkSection.classList.add('is-hidden');
    refToJobConfirm.classList.add('is-hidden');
    document.querySelectorAll('.ref-to-job-option').forEach(o => o.classList.remove('selected'));

    refToJobModal.open();
  }

  document.getElementById('refToJobSkip').addEventListener('click', () => refToJobModal.close());

  document.querySelectorAll('.ref-to-job-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.ref-to-job-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      refToJobMode = opt.dataset.mode;

      if (refToJobMode === 'new') {
        const r = refsStore.get().find(x => x.id === refToJobPending);
        if (r) createJobFromRef(r);
        refToJobModal.close();
      } else if (refToJobMode === 'link') {
        renderRefToJobList();
        refToJobLinkSection.classList.remove('is-hidden');
        refToJobConfirm.classList.remove('is-hidden');
      }
    });
  });

  function renderRefToJobList() {
    const jobs = jobsStore.get();
    const r = refsStore.get().find(x => x.id === refToJobPending);

    if (jobs.length === 0) {
      refToJobList.innerHTML = `<div class="ref-to-job-empty">${escapeHtml(t('empty.refToJob'))}</div>`;
      refToJobConfirm.disabled = true;
      return;
    }

    refToJobList.innerHTML = jobs.map(j => {
      const isSelected = refToJobSelectedId === j.id;
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

    refToJobConfirm.disabled = !refToJobSelectedId;
  }

  refToJobList.addEventListener('click', (e) => {
    const item = e.target.closest('.ref-to-job-item');
    if (!item) return;
    refToJobSelectedId = Number(item.dataset.jobId);
    refToJobList.querySelectorAll('.ref-to-job-item').forEach(i =>
      i.classList.toggle('selected', i === item)
    );
    refToJobConfirm.disabled = false;
  });

  refToJobConfirm.addEventListener('click', () => {
    if (refToJobMode !== 'link' || !refToJobSelectedId || !refToJobPending) return;
    const j = jobsStore.get().find(x => x.id === refToJobSelectedId);
    if (!j) return;

    refsStore.update(refs => refs.map(r => {
      if (r.id !== refToJobPending) return r;
      return { ...r, linkedJobId: j.id };
    }));

    refToJobModal.close();
    showToast(t('toast.linkedTo', { company: j.company }), 'icon-chain');
    scrollToJob(j.id);
  });

  // ----------------------------------------------------------
  // Create job from referral
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

    refToJobModal.close();
    showToast(t('toast.jobCreatedFromRef', { name: r.name }), 'icon-sparkle');

    setTimeout(() => {
      openEdit(newId);
      scrollToJob(newId);
    }, 400);
  }

  // ----------------------------------------------------------
  // scroll-to-job (both from the refs controller and internally)
  // ----------------------------------------------------------
  onScrollToJob((e) => {
    const { jobId } = e.detail;
    const btn = document.querySelector('#filters button[data-filter="all"]');
    if (btn && !btn.classList.contains('active')) btn.click();

    const target = document.querySelector(`#list .job[data-id="${jobId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.remove('highlighted');
      void target.offsetWidth;
      target.classList.add('highlighted');
      setTimeout(() => target.classList.remove('highlighted'), 1800);
    }
  });

  // ----------------------------------------------------------
  // i18n
  // ----------------------------------------------------------
  onI18nChanged(() => {
    if (editModal.isOpen() && editingId) {
      const j = jobsStore.get().find(x => x.id === editingId);
      if (j) updateEditStatusDisplay(j.status);
    }
    editContactLinkPicker.refresh();
  });

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  return {
    onOpenEdit: openEdit,
    onClose: openClose,
    onOpenHistory: openHistory,
    onOpenRefHistory: openRefHistory,
    onAdvance: (id, opts = {}) => {
      const direction = opts.direction || 'next';
      if (direction === 'next') openNote(id, 'next', opts);
      else confirmPrev(id);
    },
    onOpenRefEdit: openRefEdit,
    onRefToJob: openRefToJob,
  };

  // ----------------------------------------------------------
  // Go back (job)
  // ----------------------------------------------------------
  async function confirmPrev(id) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;

    if (j.wentBack) {
      showToast(t('toast.alreadyWentBackJob'), '!');
      return;
    }

    const idx = stepIndex(j.status);
    if (idx <= 0) return;

    const prevStep = WORKFLOW_STEPS[idx - 1];

    const confirmed = await showConfirm({
      title: t('confirm.prevJob.title'),
      message: t('confirm.prevJob.message', {
        role: escapeHtml(j.role),
        company: escapeHtml(j.company),
        from: escapeHtml(tState(j.status)),
        to: escapeHtml(tStateShort(prevStep.id)),
      }),
      confirmText: t('confirm.prevJob.confirm'),
    });

    if (!confirmed) return;
    applyPrev(id);
  }

  function applyPrev(id) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;
    if (j.wentBack) return;
    const idx = stepIndex(j.status);
    if (idx <= 0) return;
    const prevStatus = WORKFLOW_STEPS[idx - 1].id;

    updateById(jobsStore, id, x => withHistoryEntry(
      x,
      { status: prevStatus, wentBack: true },
      { status: prevStatus, wentBack: true }
    ));

    showToast(t('toast.backTo', { name: j.company, status: tState(prevStatus) }), 'icon-arrow-left');
  }
}