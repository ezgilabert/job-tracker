// ============================================================
// Modal: Edit job
//
// Also owns the "go back one stage" flow (confirm + apply),
// because it operates on the same job workflow as the edit
// form and shares the step constants.
// ============================================================

import { showToast } from '../../ui/feedback/toast.js';
import { showConfirm } from '../../ui/feedback/confirmModal.js';
import { DatePicker } from '../../ui/form/datePicker.js';
import { RoleCombo } from '../../ui/form/combo.js';
import { WorkModePicker } from '../../ui/form/workModePicker.js';
import { CurrencyPicker } from '../../ui/form/currencyPicker.js';
import { SalaryModeChip } from '../../ui/form/salaryModeChip.js';
import { SalaryInput } from '../../ui/form/salaryInput.js';
import { ContactLinkPicker } from '../../ui/form/contactLinkPicker.js';
import { createModal } from '../../ui/modal.js';
import {
  WORKFLOW_STEPS, getStateIcon,
} from '../../app/constants.js';
import { stepIndex } from '../../app/selectors.js';
import {
  escapeHtml, valueOf, setVal, updateById, withHistoryEntry,
} from '../../app/utils.js';
import { t, tState, tStateShort } from '../../i18n/index.js';
import { onI18nChanged } from '../../app/events.js';
import { icon } from '../../app/icons.js';

export function mountEditJobModal(jobsStore, configStore, createRoleCtrl) {
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

  const modal = createModal(document.getElementById('editModal'), {
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

  function open(id) {
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

    modal.open();
  }

  document.getElementById('cancelEdit').addEventListener('click', () => modal.close());

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

    modal.close();
    showToast(t('modal.saveChanges'), 'icon-check');
  });

  // ----------------------------------------------------------
  // Go back one stage
  // ----------------------------------------------------------
  async function goBack(id) {
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

    showToast(
      t('toast.backTo', { name: j.company, status: tState(prevStatus) }),
      'icon-arrow-left'
    );
  }

  // ----------------------------------------------------------
  // i18n: re-render the readonly status display when the language
  // changes while the modal is open.
  // ----------------------------------------------------------
  onI18nChanged(() => {
    if (modal.isOpen() && editingId) {
      const j = jobsStore.get().find(x => x.id === editingId);
      if (j) updateEditStatusDisplay(j.status);
    }
    editContactLinkPicker.refresh();
  });

  return { open, close: () => modal.close(), goBack };
}