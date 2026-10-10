// ============================================================
// Controller: modals
// ============================================================

import { showToast } from '../ui/toast.js';
import { showConfirm } from '../ui/confirmModal.js';
import { DatePicker } from '../ui/datePicker.js';
import { PuestoCombo } from '../ui/combo.js';
import { ModalidadPicker } from '../ui/modalidad.js';
import { CurrencyPicker } from '../ui/currencyPicker.js';
import { mountChips } from '../ui/chips.js';
import { renderCompanyChips, mountCompanyChips } from '../ui/empresasChips.js';
import {
  CLOSE_REASONS, ALL_STATES, WORKFLOW_STEPS,
  getStateIcon, getRefStateIcon,
} from '../constants.js';
import {
  stepIndex, isClosed,
} from '../selectors.js';
import {
  escapeHtml, todayISO, cloneArray, ensureArray, bindHourlySalaryPlaceholder,
  formatDateTime,
} from '../utils.js';
import {
  t, tState, tStateShort, tRefState, tRefStateShort,
} from '../i18n.js';

/**
 * @param {import('../store.js').Store} jobsStore
 * @param {import('../store.js').Store} refsStore
 * @param {import('../store.js').Store} configStore
 * @param {{ requestNewPuesto: (suggested:string)=>Promise<string|null> }} createPuestoCtrl
 */
export function mountModalsController(jobsStore, refsStore, configStore, createPuestoCtrl) {
  // ----------------------------------------------------------
  // Edit job
  // ----------------------------------------------------------
  const editModal = document.getElementById('editModal');
  const editEstado = document.getElementById('editEstado');
  const editSalaryHourlyCheckbox = document.getElementById('editSalarioPorHora');

  editEstado.innerHTML = ALL_STATES
    .map(s => `<option value="${escapeHtml(s)}">${escapeHtml(tState(s))}</option>`)
    .join('');

  let editingId = null;
  const editFecha = new DatePicker(document.getElementById('editFechaPicker'));
  const editPuesto = new PuestoCombo(document.getElementById('editPuestoCombo'), {
    getJobPuestos: () => jobsStore.get().map(j => j.puesto),
    getConfig: () => configStore.get(),
    onCreateRequested: (suggested) => createPuestoCtrl.requestNewPuesto(suggested),
  });
  const editModalidad = new ModalidadPicker(
    document.getElementById('editModalidadPicker'),
    {
      hybridWrap: document.getElementById('editHybridDaysWrap'),
      hybridSelect: document.getElementById('editHybridOfficeDays'),
    }
  );
  const editCurrency = new CurrencyPicker(
    document.getElementById('editSalarioCurrencyChip'),
    { value: 'usd' }
  );

  const updateEditSalaryPlaceholder = bindHourlySalaryPlaceholder(
    document.getElementById('editSalario'),
    editSalaryHourlyCheckbox,
    () => editCurrency.getValue()
  );

  editCurrency.onChange = () => updateEditSalaryPlaceholder();

  function openEdit(id) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;
    editingId = id;

    setVal('editEmpresa', j.empresa);
    setVal('editPuesto', j.puesto);
    editFecha.setValue(j.fecha || '');
    editEstado.value = j.estado;
    setVal('editLink', j.link || '');
    setVal('editSalario', j.salario || '');
    editSalaryHourlyCheckbox.checked = Boolean(j.salarioPorHora);
    editCurrency.setValue(j.moneda || 'usd');
    updateEditSalaryPlaceholder();
    setVal('editContacto', j.contacto || '');
    setVal('editNotas', j.notas || '');
    editModalidad.setValue(j.modalidad || '', j.hybridOfficeDays || 3);

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

    const modal = editModalidad.getValue();

    jobsStore.update(jobs => jobs.map(j => {
      if (j.id !== editingId) return j;
      return {
        ...j,
        empresa:   valueOf('editEmpresa'),
        puesto:    valueOf('editPuesto'),
        fecha:     editFecha.getValue(),
        link:      valueOf('editLink'),
        salario:   valueOf('editSalario'),
        salarioPorHora: editSalaryHourlyCheckbox.checked,
        moneda:    editCurrency.getValue(),
        modalidad: modal.modalidad,
        hybridOfficeDays: modal.hybridOfficeDays,
        contacto:  valueOf('editContacto'),
        notas:     valueOf('editNotas'),
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
  const closeReasonInput = document.getElementById('closeMotivo');
  let pendingClose = null;

  function openClose(id, estado) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;
    pendingClose = { id, estado };

    document.getElementById('closeModalTitle').textContent =
      t('close.titleAs', { estado: tState(estado) });
    document.getElementById('closeModalSubtitle').innerHTML =
      `<strong>${escapeHtml(j.puesto)}</strong> · ${escapeHtml(j.empresa)}`;

    const reasons = CLOSE_REASONS[estado] || [];
    closeReasonsEl.innerHTML = reasons
      .map(r => `<button type="button" class="close-reason-chip" data-reason="${escapeHtml(r)}">${escapeHtml(r)}</button>`)
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

    const { id, estado } = pendingClose;
    const closedJob = jobsStore.get().find(x => x.id === id);

    jobsStore.update(jobs => jobs.map(j => {
      if (j.id !== id) return j;
      const history = cloneArray(j.history);
      history.push({ estado, fecha: new Date().toISOString(), motivo: reason });
      const patch = { ...j, estado, history };
      if (estado === 'Oferta') patch.offerConfirmed = true;
      return patch;
    }));

    if (estado === 'Oferta') {
      syncLinkedRefToContratado(id, closedJob);
    }

    hideClose();
    const icons = { 'Rechazado': '✕', 'Ghosted': '👻', 'Descartado': '🚫', 'Oferta': '🎉' };
    showToast(t('toast.closedAs', { estado: tState(estado) }), icons[estado] || '✓');
  });

  function syncLinkedRefToContratado(jobId, job) {
    refsStore.update(refs => refs.map(r => {
      if (r.linkedJobId !== jobId) return r;
      if (r.estado === 'No aplica') return r;
      if (r.estado === 'Contratado') return r;

      const history = cloneArray(r.history);
      const label = job
        ? `${job.puesto || '—'} · ${job.empresa || '—'}`
        : '—';
      history.push({
        estado: 'Contratado',
        fecha: new Date().toISOString(),
        motivo: `Offer accepted: ${label}`,
      });
      return { ...r, estado: 'Contratado', history };
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
      `<strong>${escapeHtml(j.puesto)}</strong> · ${escapeHtml(j.empresa)}`;

    const history = ensureArray(j.history);
    const lastIdx = history.length - 1;

    if (history.length === 0) {
      historyTimeline.innerHTML = `<div class="history-empty">${escapeHtml(t('hist.empty'))}</div>`;
    } else {
      historyTimeline.innerHTML = history.map((entry, i) => {
        const isCurrent = i === lastIdx && !isClosed(entry.estado);
        const isClosedEntry = isClosed(entry.estado);
        const isBackward = Boolean(entry.retroceso);

        let itemClass = 'history-item';
        if (isCurrent) itemClass += ' current';
        if (isBackward) itemClass += ' retroceso';
        if (isClosedEntry) itemClass += ' closed-' + entry.estado.toLowerCase().replace(/\s+/g, '-');

        let tagsHtml = '';
        if (isCurrent) tagsHtml += `<span class="history-tag current">${escapeHtml(t('hist.current'))}</span>`;
        if (isBackward) tagsHtml += `<span class="history-tag retroceso">${escapeHtml(t('hist.backward'))}</span>`;
        if (isClosedEntry && entry.estado !== 'Oferta') {
          tagsHtml += `<span class="history-tag cerrada">${escapeHtml(t('hist.closed'))}</span>`;
        }
        if (entry.estado === 'Oferta') {
          tagsHtml += `<span class="history-tag oferta">${escapeHtml(t('hist.offer'))}</span>`;
        }

        const reasonHtml = entry.motivo
          ? `<div class="history-motivo">"${escapeHtml(entry.motivo)}"</div>`
          : '';

        const noteHtml = entry.nota
          ? `<div class="history-nota"><strong>${escapeHtml(t('hist.note'))}</strong>${escapeHtml(entry.nota)}</div>`
          : '';

        return `
          <div class="${itemClass}">
            <div class="history-dot">${getStateIcon(entry.estado)}</div>
            <div class="history-content">
              <div class="history-estado">
                ${escapeHtml(tState(entry.estado))}
                ${tagsHtml}
              </div>
              <div class="history-fecha">${formatDateTime(entry.fecha)}</div>
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
      `<strong>${escapeHtml(r.nombre)}</strong>` +
      (r.rol ? ` · ${escapeHtml(r.rol)}` : '');

    const history = ensureArray(r.history);
    const lastIdx = history.length - 1;

    if (history.length === 0) {
      refHistoryTimeline.innerHTML =
        `<div class="history-empty">${escapeHtml(t('hist.empty'))}</div>`;
    } else {
      refHistoryTimeline.innerHTML = history.map((entry, i) => {
        const isCurrent = i === lastIdx && entry.estado !== 'No aplica';
        const isClosedEntry = entry.estado === 'No aplica';
        const isBackward = Boolean(entry.retroceso);

        let itemClass = 'history-item';
        if (isCurrent) itemClass += ' current';
        if (isBackward) itemClass += ' retroceso';
        if (isClosedEntry) itemClass += ' closed-rechazado';

        let tagsHtml = '';
        if (isCurrent) tagsHtml += `<span class="history-tag current">${escapeHtml(t('hist.current'))}</span>`;
        if (isBackward) tagsHtml += `<span class="history-tag retroceso">${escapeHtml(t('hist.backward'))}</span>`;
        if (isClosedEntry) tagsHtml += `<span class="history-tag cerrada">${escapeHtml(t('hist.closedRef'))}</span>`;

        const reasonHtml = entry.motivo
          ? `<div class="history-motivo">"${escapeHtml(entry.motivo)}"</div>`
          : '';

        const noteHtml = entry.nota
          ? `<div class="history-nota"><strong>${escapeHtml(t('hist.note'))}</strong>${escapeHtml(entry.nota)}</div>`
          : '';

        return `
          <div class="${itemClass}">
            <div class="history-dot">${getRefStateIcon(entry.estado)}</div>
            <div class="history-content">
              <div class="history-estado">
                ${escapeHtml(tRefState(entry.estado))}
                ${tagsHtml}
              </div>
              <div class="history-fecha">${formatDateTime(entry.fecha)}</div>
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

    const idx = stepIndex(j.estado);
    if (idx < 0) return;

    const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= WORKFLOW_STEPS.length) return;

    const nextState = WORKFLOW_STEPS[nextIdx].id;
    pendingAdvance = { id, nextState, skipCurrent: !!opts.skipCurrent, direction };

    noteSubtitle.innerHTML = t('note.subtitle', {
      step: escapeHtml(tStateShort(nextState)),
      name: escapeHtml(j.empresa),
    });

    stepNoteInput.value = '';
    noteModal.classList.add('open');
    setTimeout(() => stepNoteInput.focus(), 80);
  }

  function applyAdvance({ note } = {}) {
    if (!pendingAdvance) return;
    const { id, nextState, skipCurrent } = pendingAdvance;

    jobsStore.update(jobs => jobs.map(j => {
      if (j.id !== id) return j;
      const skipped = cloneArray(j.skipped);
      if (skipCurrent && !skipped.includes(j.estado)) skipped.push(j.estado);

      const history = cloneArray(j.history);
      const entry = { estado: nextState, fecha: new Date().toISOString() };
      if (note) entry.nota = note;
      history.push(entry);

      return { ...j, estado: nextState, skipped, history };
    }));

    const j = jobsStore.get().find(x => x.id === id);
    showToast(
      t('toast.advanceTo', { name: j?.empresa ?? '', estado: tState(nextState) }),
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

  const refEditRelacion = mountChips(
    document.getElementById('refEditRelacionChips'),
    { onChange: () => {} }
  );
  const refEditEstado = mountChips(
    document.getElementById('refEditEstadoChips'),
    { onChange: () => {} }
  );
  let refEditCompanies = new Set();

  mountCompanyChips(document.getElementById('refEditEmpresasWrap'), refEditCompanies);

  function openRefEdit(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    refEditingId = id;

    setVal('refEditNombre', r.nombre);
    setVal('refEditRol', r.rol || '');
    setVal('refEditContacto', r.contacto || '');
    setVal('refEditLink', r.link || '');
    setVal('refEditNotas', r.notas || '');

    refEditRelacion.setValue(r.relacion || 'Conocido');
    refEditEstado.setValue(r.estado || 'Pendiente');
    refEditCompanies = new Set(r.empresasVinculadas || []);
    const companies = [...new Set(jobsStore.get().map(j => j.empresa).filter(Boolean))];
    renderCompanyChips(
      document.getElementById('refEditEmpresasWrap'),
      refEditCompanies,
      companies
    );

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

    refsStore.update(refs => refs.map(r => {
      if (r.id !== refEditingId) return r;
      return {
        ...r,
        nombre:   valueOf('refEditNombre'),
        rol:      valueOf('refEditRol'),
        contacto: valueOf('refEditContacto'),
        link:     valueOf('refEditLink'),
        relacion: refEditRelacion.getValue() || 'Conocido',
        estado:   refEditEstado.getValue() || 'Pendiente',
        empresasVinculadas: [...refEditCompanies],
        notas:    valueOf('refEditNotas'),
      };
    }));

    closeRefEdit();
    showToast(t('toast.refUpdated'), '✓');
  });

  // ----------------------------------------------------------
  // Move referral → jobs
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

    document.getElementById('refToJobName').textContent = r.nombre;
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
      const alreadyLinked = r?.empresasVinculadas?.includes(j.empresa);
      return `
        <button type="button"
                class="ref-to-job-item ${isSelected ? 'selected' : ''}"
                data-job-id="${j.id}">
          <div class="info">
            <strong>${escapeHtml(j.puesto)}</strong>
            <span>${escapeHtml(j.empresa)}${alreadyLinked ? ' · ' + escapeHtml(t('refToJob.alreadyLinked')) : ''}</span>
          </div>
          <span class="estado-mini">${escapeHtml(tState(j.estado))}</span>
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
      const linked = cloneArray(r.empresasVinculadas);
      if (!linked.includes(j.empresa)) linked.push(j.empresa);
      return { ...r, empresasVinculadas: linked, linkedJobId: j.id };
    }));

    closeRefToJob();
    showToast(t('toast.linkedTo', { empresa: j.empresa }), '🔗');
    document.dispatchEvent(new CustomEvent('scroll-to-job', { detail: { jobId: j.id } }));
  });

  // ----------------------------------------------------------
  // Create job from referral
  // ----------------------------------------------------------
  function createJobFromRef(r) {
    const companies = ensureArray(r.empresasVinculadas);
    const defaultCompany = companies[0] || '';

    if (defaultCompany) {
      const existing = jobsStore.get().find(j => j.empresa === defaultCompany);
      if (existing) {
        refsStore.update(refs => refs.map(x => {
          if (x.id !== r.id) return x;
          const linked = cloneArray(x.empresasVinculadas);
          if (!linked.includes(existing.empresa)) linked.push(existing.empresa);
          return { ...x, empresasVinculadas: linked, linkedJobId: existing.id };
        }));
        closeRefToJob();
        showToast(t('toast.alreadyExisted', { empresa: existing.empresa }), '🔗');
        document.dispatchEvent(new CustomEvent('scroll-to-job', { detail: { jobId: existing.id } }));
        return;
      }
    }

    const newId = Date.now();
    const newJob = {
      id: newId,
      empresa: defaultCompany || '—',
      puesto: '',
      fecha: todayISO(),
      estado: 'Contacto',
      link: '',
      salario: '',
      moneda: 'usd',
      modalidad: '',
      hybridOfficeDays: null,
      contacto: r.nombre + (r.rol ? ` (${r.rol})` : ''),
      notas: `Referido por ${r.nombre}${r.notas ? '. ' + r.notas : ''}`,
      skipped: [],
      volvioAtras: false,
      history: [{
        estado: 'Contacto',
        fecha: new Date().toISOString(),
        motivo: `Referido: ${r.nombre}`,
      }],
    };

    jobsStore.update(jobs => [newJob, ...jobs]);

    refsStore.update(refs => refs.map(x => {
      if (x.id !== r.id) return x;
      const linked = cloneArray(x.empresasVinculadas);
      if (newJob.empresa && !linked.includes(newJob.empresa)) linked.push(newJob.empresa);
      return { ...x, empresasVinculadas: linked, linkedJobId: newId };
    }));

    closeRefToJob();
    showToast(t('toast.jobCreatedFromRef', { name: r.nombre }), '✨');

    setTimeout(() => {
      openEdit(newId);
      document.dispatchEvent(new CustomEvent('scroll-to-job', { detail: { jobId: newId } }));
    }, 400);
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------
  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  }
  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  document.addEventListener('scroll-to-job', (e) => {
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

    if (j.volvioAtras) {
      showToast(t('toast.alreadyWentBackJob'), '!');
      return;
    }

    const idx = stepIndex(j.estado);
    if (idx <= 0) return;

    const prevStep = WORKFLOW_STEPS[idx - 1];

    const confirmed = await showConfirm({
      title: t('confirm.prevJob.title'),
      message: t('confirm.prevJob.message', {
        puesto: escapeHtml(j.puesto),
        empresa: escapeHtml(j.empresa),
        from: escapeHtml(tState(j.estado)),
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
    if (j.volvioAtras) return;
    const idx = stepIndex(j.estado);
    if (idx <= 0) return;
    const prevState = WORKFLOW_STEPS[idx - 1].id;

    jobsStore.update(jobs => jobs.map(x => {
      if (x.id !== id) return x;
      const history = cloneArray(x.history);
      history.push({ estado: prevState, fecha: new Date().toISOString(), retroceso: true });
      return { ...x, estado: prevState, history, volvioAtras: true };
    }));
    showToast(t('toast.backTo', { name: j.empresa, estado: tState(prevState) }), '←');
  }
}