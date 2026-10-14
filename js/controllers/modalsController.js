// ============================================================
// Controller: modals
// ============================================================

import { showToast } from '../ui/toast.js';
import { showConfirm } from '../ui/confirmModal.js';
import { DatePicker } from '../ui/datePicker.js';
import { RoleCombo } from '../ui/combo.js';
import { WorkModePicker } from '../ui/workModePicker.js';
import { CurrencyPicker } from '../ui/currencyPicker.js';
import { SalaryModeChip } from '../ui/salaryModeChip.js';
import { SalaryInput } from '../ui/salaryInput.js';
import { ContactLinkPicker } from '../ui/contactLinkPicker.js';
import { mountChips } from '../ui/chips.js';
import {
  CLOSE_REASON_KEYS, WORKFLOW_STEPS,
  getStateIcon, getRefStateIcon,
} from '../constants.js';
import { stepIndex, isClosed } from '../selectors.js';
import {
  escapeHtml, todayISO, cloneArray, ensureArray,
  formatDateTime, valueOf, setVal,
} from '../utils.js';
import {
  t, tState, tStateShort, tRefState, tRefStateShort,
} from '../i18n.js';
import { scrollToJob, onScrollToJob, onI18nChanged } from '../events.js';
import { withUndo } from '../undo.js';

/**
 * @param {import('../store.js').Store} jobsStore
 * @param {import('../store.js').Store} refsStore
 * @param {import('../store.js').Store} configStore
 * @param {{ requestNewRole: (suggested:string)=>Promise<string|null> }} createRoleCtrl
 */
export function mountModalsController(jobsStore, refsStore, configStore, createRoleCtrl) {
  // ----------------------------------------------------------
  // Edit job
  // ----------------------------------------------------------
  const editModal = document.getElementById('editModal');

  const editStatusEl = document.getElementById('editStatus');
  const editStatusIcon = editStatusEl
    ? editStatusEl.querySelector('[data-status-icon]')
    : null;
  const editStatusText = editStatusEl
    ? editStatusEl.querySelector('[data-status-text]')
    : null;

  function updateEditStatusDisplay(status) {
    if (editStatusIcon) editStatusIcon.textContent = getStateIcon(status);
    if (editStatusText) editStatusText.textContent = tState(status);
  }

  const editHourlySalaryCheckbox = document.getElementById('editHourlySalary');

  let editingId = null;
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

    editModal.classList.add('open');
  }

  function closeEdit() {
    editModal.classList.remove('open');
    editingId = null;
  }

  document.getElementById('cancelEdit').addEventListener('click', closeEdit);
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEdit();
  });

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

    closeEdit();
    showToast(t('modal.saveChanges'), '✓');
  });

  // ----------------------------------------------------------
  // Close job with reason
  // ----------------------------------------------------------
  const closeModal = document.getElementById('closeModal');
  const closeReasonsEl = document.getElementById('closeReasons');
  const closeReasonInput = document.getElementById('closeReason');
  let pendingClose = null;

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

    closeModal.classList.add('open');
    setTimeout(() => closeReasonInput.focus(), 100);
  }

  function hideClose() {
    closeModal.classList.remove('open');
    pendingClose = null;
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

  document.getElementById('cancelClose').addEventListener('click', hideClose);
  closeModal.addEventListener('click', (e) => {
    if (e.target === closeModal) hideClose();
  });

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
    const icons = { 'Rejected': '✕', 'Ghosted': '👻', 'Discarded': '🚫', 'Offer': '🎉' };

    withUndo(
      [jobsStore, refsStore],
      t('toast.closedAs', { status: tState(status) }),
      () => {
        jobsStore.update(jobs => jobs.map(j => {
          if (j.id !== id) return j;
          const history = cloneArray(j.history);
          history.push({ status, date: new Date().toISOString(), reason });
          const patch = { ...j, status, history };
          if (status === 'Offer') patch.offerConfirmed = true;
          return patch;
        }));

        if (status === 'Offer') {
          syncLinkedRefToHired(id, closedJob);
        }
      },
      icons[status] || '✓'
    );

    hideClose();
  });

  function syncLinkedRefToHired(jobId, job) {
    refsStore.update(refs => refs.map(r => {
      if (r.linkedJobId !== jobId) return r;
      if (r.status === 'Not Applicable') return r;
      if (r.status === 'Hired') return r;

      const history = cloneArray(r.history);
      const label = job
        ? `${job.role || '—'} · ${job.company || '—'}`
        : '—';
      history.push({
        status: 'Hired',
        date: new Date().toISOString(),
        reason: `Offer accepted: ${label}`,
      });
      return { ...r, status: 'Hired', history };
    }));
  }

  // ----------------------------------------------------------
  // History (jobs)
  // ----------------------------------------------------------
  const historyModal = document.getElementById('historyModal');
  const historySubtitle = document.getElementById('historySubtitle');
  const historyTimeline = document.getElementById('historyTimeline');
  const historySkipped = document.getElementById('historySkipped');
  const historySkippedList = document.getElementById('historySkippedList');

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
            <div class="history-dot">${getStateIcon(entry.status)}</div>
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
      historySkipped.style.display = 'block';
      historySkippedList.innerHTML = skipped
        .map(s => `<span class="history-skipped-tag">${escapeHtml(tState(s))}</span>`)
        .join('');
    } else {
      historySkipped.style.display = 'none';
    }

    historyModal.classList.add('open');
  }

  function closeHistory() {
    historyModal.classList.remove('open');
  }

  document.getElementById('closeHistoryBtn').addEventListener('click', closeHistory);
  document.getElementById('closeHistoryModal').addEventListener('click', closeHistory);
  historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) closeHistory();
  });

  // ----------------------------------------------------------
  // History (referrals)
  // ----------------------------------------------------------
  const refHistoryModal = document.getElementById('refHistoryModal');
  const refHistorySubtitle = document.getElementById('refHistorySubtitle');
  const refHistoryTimeline = document.getElementById('refHistoryTimeline');

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
            <div class="history-dot">${getRefStateIcon(entry.status)}</div>
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

    refHistoryModal.classList.add('open');
  }

  function closeRefHistory() {
    refHistoryModal.classList.remove('open');
  }

  document.getElementById('closeRefHistoryBtn').addEventListener('click', closeRefHistory);
  document.getElementById('closeRefHistoryModal').addEventListener('click', closeRefHistory);
  refHistoryModal.addEventListener('click', (e) => {
    if (e.target === refHistoryModal) closeRefHistory();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (refHistoryModal.classList.contains('open')) closeRefHistory();
    else if (historyModal.classList.contains('open')) closeHistory();
  });

  // ----------------------------------------------------------
  // Note on advance (jobs)
  // ----------------------------------------------------------
  const noteModal = document.getElementById('noteModal');
  const stepNoteInput = document.getElementById('stepNoteInput');
  const noteSubtitle = document.getElementById('noteModalSubtitle');
  let pendingAdvance = null;

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
    noteModal.classList.add('open');
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
        jobsStore.update(jobs => jobs.map(j => {
          if (j.id !== id) return j;
          const skipped = cloneArray(j.skipped);
          if (skipCurrent && !skipped.includes(j.status)) skipped.push(j.status);

          const history = cloneArray(j.history);
          const entry = { status: nextStatus, date: new Date().toISOString() };
          if (note) entry.note = note;
          history.push(entry);

          return { ...j, status: nextStatus, skipped, history };
        }));
      },
      skipCurrent ? '🚫' : '→'
    );
  }

  function hideNote() {
    noteModal.classList.remove('open');
    pendingAdvance = null;
  }

  document.getElementById('skipNote').addEventListener('click', () => {
    applyAdvance({ note: null });
    hideNote();
  });

  document.getElementById('saveNote').addEventListener('click', () => {
    applyAdvance({ note: stepNoteInput.value.trim() || null });
    hideNote();
  });

  document.getElementById('closeNoteModal').addEventListener('click', hideNote);

  noteModal.addEventListener('click', (e) => {
    if (e.target === noteModal) {
      applyAdvance({ note: null });
      hideNote();
    }
  });

  // ----------------------------------------------------------
  // Edit referral
  // ----------------------------------------------------------
  const refEditModal = document.getElementById('refEditModal');
  let refEditingId = null;

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

    refEditModal.classList.add('open');
  }

  function closeRefEdit() {
    refEditModal.classList.remove('open');
    refEditingId = null;
  }

  document.getElementById('refCancelEdit').addEventListener('click', closeRefEdit);
  refEditModal.addEventListener('click', (e) => {
    if (e.target === refEditModal) closeRefEdit();
  });

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

    closeRefEdit();
    showToast(t('toast.refUpdated'), '✓');
  });

  // ----------------------------------------------------------
  // Move referral → applications
  // ----------------------------------------------------------
  const refToJobModal = document.getElementById('refToJobModal');
  const refToJobLinkSection = document.getElementById('refToJobLinkSection');
  const refToJobList = document.getElementById('refToJobList');
  const refToJobConfirm = document.getElementById('refToJobConfirm');
  let refToJobPending = null;
  let refToJobMode = null;
  let refToJobSelectedId = null;

  function openRefToJob(refId) {
    const r = refsStore.get().find(x => x.id === refId);
    if (!r) return;

    refToJobPending = refId;
    refToJobMode = null;
    refToJobSelectedId = null;

    document.getElementById('refToJobName').textContent = r.name;
    refToJobLinkSection.style.display = 'none';
    refToJobConfirm.style.display = 'none';
    document.querySelectorAll('.ref-to-job-option').forEach(o => o.classList.remove('selected'));

    refToJobModal.classList.add('open');
  }

  function closeRefToJob() {
    refToJobModal.classList.remove('open');
    refToJobPending = null;
    refToJobMode = null;
    refToJobSelectedId = null;
  }

  document.getElementById('refToJobSkip').addEventListener('click', closeRefToJob);
  refToJobModal.addEventListener('click', (e) => {
    if (e.target === refToJobModal) closeRefToJob();
  });

  document.querySelectorAll('.ref-to-job-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.ref-to-job-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      refToJobMode = opt.dataset.mode;

      if (refToJobMode === 'new') {
        const r = refsStore.get().find(x => x.id === refToJobPending);
        if (r) createJobFromRef(r);
        closeRefToJob();
      } else if (refToJobMode === 'link') {
        renderRefToJobList();
        refToJobLinkSection.style.display = 'block';
        refToJobConfirm.style.display = 'inline-flex';
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

    closeRefToJob();
    showToast(t('toast.linkedTo', { company: j.company }), '🔗');
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

    closeRefToJob();
    showToast(t('toast.jobCreatedFromRef', { name: r.name }), '✨');

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
    if (editModal.classList.contains('open') && editingId) {
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

    jobsStore.update(jobs => jobs.map(x => {
      if (x.id !== id) return x;
      const history = cloneArray(x.history);
      history.push({ status: prevStatus, date: new Date().toISOString(), wentBack: true });
      return { ...x, status: prevStatus, history, wentBack: true };
    }));
    showToast(t('toast.backTo', { name: j.company, status: tState(prevStatus) }), '←');
  }
}