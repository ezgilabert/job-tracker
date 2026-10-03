// ============================================================
// Controller: modals
// - Edit job
// - Close job (with reason)
// - Edit referral
// - Move referral → job
// - Note on advance
// ============================================================

import { showToast } from '../ui/toast.js';
import { DatePicker } from '../ui/datePicker.js';
import { PuestoCombo } from '../ui/combo.js';
import { mountChips } from '../ui/chips.js';
import { renderEmpresasChips, mountEmpresasChips } from '../ui/empresasChips.js';
import {
  CLOSE_REASONS, ALL_STATES, WORKFLOW_STEPS,
} from '../constants.js';
import {
  stepIndex, progressPct,
} from '../selectors.js';
import {
  escapeHtml, todayISO, cloneArray, ensureArray, bindHourlySalaryPlaceholder,
} from '../utils.js';

/**
 * @param {import('../store.js').Store} jobsStore
 * @param {import('../store.js').Store} refsStore
 */
export function mountModalsController(jobsStore, refsStore) {
  // ----------------------------------------------------------
  // Edit job
  // ----------------------------------------------------------
  const editModal = document.getElementById('editModal');
  const editEstado = document.getElementById('editEstado');
  const editSalaryHourlyCheckbox = document.getElementById('editSalarioPorHora');
  const updateEditSalaryPlaceholder = bindHourlySalaryPlaceholder(
    document.getElementById('editSalario'),
    editSalaryHourlyCheckbox
  );

  // Include open + closed states so edits can also close a job
  editEstado.innerHTML = ALL_STATES
    .map(s => `<option>${escapeHtml(s)}</option>`)
    .join('');

  let editingId = null;
  const editFecha = new DatePicker(document.getElementById('editFechaPicker'));
  const editPuesto = new PuestoCombo(document.getElementById('editPuestoCombo'), {
    getJobPuestos: () => jobsStore.get().map(j => j.puesto),
  });

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
    updateEditSalaryPlaceholder();
    setVal('editContacto', j.contacto || '');
    setVal('editNotas', j.notas || '');

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
    const nuevoEstado = editEstado.value;

    jobsStore.update(jobs => jobs.map(j => {
      if (j.id !== editingId) return j;
      const history = cloneArray(j.history);
      if (nuevoEstado !== j.estado) {
        history.push({ estado: nuevoEstado, fecha: new Date().toISOString() });
      }
      return {
        ...j,
        empresa:   valueOf('editEmpresa'),
        puesto:    valueOf('editPuesto'),
        fecha:     editFecha.getValue(),
        estado:    nuevoEstado,
        link:      valueOf('editLink'),
        salario:   valueOf('editSalario'),
        salarioPorHora: editSalaryHourlyCheckbox.checked,
        contacto:  valueOf('editContacto'),
        notas:     valueOf('editNotas'),
        history,
      };
    }));

    closeEdit();
    showToast('Cambios guardados', '✓');
  });

  // ----------------------------------------------------------
  // Close job with reason
  // ----------------------------------------------------------
  const closeModal = document.getElementById('closeModal');
  const closeReasonsEl = document.getElementById('closeReasons');
  const closeMotivo = document.getElementById('closeMotivo');
  let pendingClose = null;

  function openClose(id, estado) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;
    pendingClose = { id, estado };

    document.getElementById('closeModalTitle').textContent = `Cerrar como ${estado}`;
    document.getElementById('closeModalSubtitle').innerHTML =
      `<strong>${escapeHtml(j.puesto)}</strong> · ${escapeHtml(j.empresa)}`;

    const reasons = CLOSE_REASONS[estado] || [];
    closeReasonsEl.innerHTML = reasons
      .map(r => `<button type="button" class="close-reason-chip" data-reason="${escapeHtml(r)}">${escapeHtml(r)}</button>`)
      .join('');

    closeMotivo.value = '';
    closeMotivo.style.borderColor = '';
    closeMotivo.style.boxShadow = '';

    closeModal.classList.add('open');
    setTimeout(() => closeMotivo.focus(), 100);
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
    closeMotivo.value = chip.dataset.reason;
    closeMotivo.focus();
  });

  closeMotivo.addEventListener('input', () => {
    closeMotivo.style.borderColor = '';
    closeMotivo.style.boxShadow = '';
  });

  document.getElementById('cancelClose').addEventListener('click', hideClose);
  closeModal.addEventListener('click', (e) => {
    if (e.target === closeModal) hideClose();
  });

  document.getElementById('confirmClose').addEventListener('click', () => {
    if (!pendingClose) return;
    const motivo = closeMotivo.value.trim();
    if (!motivo) {
      closeMotivo.focus();
      closeMotivo.style.borderColor = 'var(--danger)';
      closeMotivo.style.boxShadow = '0 0 0 3px var(--danger-soft)';
      showToast('Escribí o elegí un motivo', '!');
      return;
    }

    const { id, estado } = pendingClose;
    jobsStore.update(jobs => jobs.map(j => {
      if (j.id !== id) return j;
      const history = cloneArray(j.history);
      history.push({ estado, fecha: new Date().toISOString(), motivo });
      return { ...j, estado, history };
    }));

    hideClose();
    const icons = { 'Rechazado': '✕', 'Ghosted': '👻', 'Descartado': '🚫', 'Oferta': '🎉' };
    showToast(`Cerrada como ${estado}`, icons[estado] || '✓');
  });

  // ----------------------------------------------------------
  // Note on advance
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

    const nuevoEstado = WORKFLOW_STEPS[nextIdx].id;
    pendingAdvance = { id, nuevoEstado, skipCurrent: !!opts.skipCurrent, direction };

    const step = WORKFLOW_STEPS[nextIdx];
    noteSubtitle.innerHTML =
      `Vas a pasar a <strong>${escapeHtml(step.short)}</strong> en <strong>${escapeHtml(j.empresa)}</strong>. ¿Querés dejar un recordatorio para esta etapa?`;

    stepNoteInput.value = '';
    noteModal.classList.add('open');
    setTimeout(() => stepNoteInput.focus(), 80);
  }

  function applyAdvance({ nota } = {}) {
    if (!pendingAdvance) return;
    const { id, nuevoEstado, skipCurrent } = pendingAdvance;

    jobsStore.update(jobs => jobs.map(j => {
      if (j.id !== id) return j;
      const skipped = cloneArray(j.skipped);
      if (skipCurrent && !skipped.includes(j.estado)) skipped.push(j.estado);

      const history = cloneArray(j.history);
      const entry = { estado: nuevoEstado, fecha: new Date().toISOString() };
      if (nota) entry.nota = nota;
      history.push(entry);

      return { ...j, estado: nuevoEstado, skipped, history };
    }));

    const j = jobsStore.get().find(x => x.id === id);
    showToast(`${j?.empresa ?? ''}: ${nuevoEstado}`, skipCurrent ? '🚫' : '→');
  }

  function hideNote() {
    noteModal.classList.remove('open');
    pendingAdvance = null;
  }

  document.getElementById('skipNote').addEventListener('click', () => {
    applyAdvance({ nota: null });
    hideNote();
  });

  document.getElementById('saveNote').addEventListener('click', () => {
    applyAdvance({ nota: stepNoteInput.value.trim() || null });
    hideNote();
  });

  noteModal.addEventListener('click', (e) => {
    if (e.target === noteModal) {
      applyAdvance({ nota: null });
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
  let refEditEmpresas = new Set();

  mountEmpresasChips(document.getElementById('refEditEmpresasWrap'), refEditEmpresas);

  function openRefEdit(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    refEditingId = id;

    setVal('refEditNombre', r.nombre);
    setVal('refEditRol', r.rol || '');
    setVal('refEditContacto', r.contacto || '');
    setVal('refEditLinkedin', r.linkedin || '');
    setVal('refEditNotas', r.notas || '');

    refEditRelacion.setValue(r.relacion || 'Conocido');
    refEditEstado.setValue(r.estado || 'Pendiente');
    refEditEmpresas = new Set(r.empresasVinculadas || []);
    const empresas = [...new Set(jobsStore.get().map(j => j.empresa).filter(Boolean))];
    renderEmpresasChips(
      document.getElementById('refEditEmpresasWrap'),
      refEditEmpresas,
      empresas
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
        linkedin: valueOf('refEditLinkedin'),
        relacion: refEditRelacion.getValue() || 'Conocido',
        estado:   refEditEstado.getValue() || 'Pendiente',
        empresasVinculadas: [...refEditEmpresas],
        notas:    valueOf('refEditNotas'),
      };
    }));

    closeRefEdit();
    showToast('Referido actualizado', '✓');
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
      refToJobList.innerHTML = `<div class="ref-to-job-empty">No hay postulaciones cargadas todavía</div>`;
      refToJobConfirm.disabled = true;
      return;
    }

    refToJobList.innerHTML = jobs.map(j => {
      const sel = refToJobSelectedId === j.id;
      const yaVinculado = r?.empresasVinculadas?.includes(j.empresa);
      return `
        <button type="button"
                class="ref-to-job-item ${sel ? 'selected' : ''}"
                data-job-id="${j.id}">
          <div class="info">
            <strong>${escapeHtml(j.puesto)}</strong>
            <span>${escapeHtml(j.empresa)}${yaVinculado ? ' · ya vinculado' : ''}</span>
          </div>
          <span class="estado-mini">${escapeHtml(j.estado)}</span>
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
      const vinculadas = cloneArray(r.empresasVinculadas);
      if (!vinculadas.includes(j.empresa)) vinculadas.push(j.empresa);
      return { ...r, empresasVinculadas: vinculadas };
    }));

    closeRefToJob();
    showToast(`Vinculado a ${j.empresa}`, '🔗');
    document.dispatchEvent(new CustomEvent('scroll-to-job', { detail: { jobId: j.id } }));
  });

  // ----------------------------------------------------------
  // Create job from referral
  // ----------------------------------------------------------
  function createJobFromRef(r) {
    const empresas = ensureArray(r.empresasVinculadas);
    const empresaDefault = empresas[0] || '';

    // If a job for that company already exists, link instead of duplicating
    if (empresaDefault) {
      const existente = jobsStore.get().find(j => j.empresa === empresaDefault);
      if (existente) {
        refsStore.update(refs => refs.map(x => {
          if (x.id !== r.id) return x;
          const vinculadas = cloneArray(x.empresasVinculadas);
          if (!vinculadas.includes(existente.empresa)) vinculadas.push(existente.empresa);
          return { ...x, empresasVinculadas: vinculadas };
        }));
        closeRefToJob();
        showToast(`Ya existía postulación en ${existente.empresa}. Vinculado.`, '🔗');
        document.dispatchEvent(new CustomEvent('scroll-to-job', { detail: { jobId: existente.id } }));
        return;
      }
    }

    const nuevoId = Date.now();
    const nuevo = {
      id: nuevoId,
      empresa: empresaDefault || 'Por definir',
      puesto: '',
      fecha: todayISO(),
      estado: 'Contacto',
      link: '',
      salario: '',
      contacto: r.nombre + (r.rol ? ` (${r.rol})` : ''),
      notas: `Referido por ${r.nombre}${r.notas ? '. ' + r.notas : ''}`,
      skipped: [],
      history: [{
        estado: 'Contacto',
        fecha: new Date().toISOString(),
        motivo: `Creado desde referido: ${r.nombre}`,
      }],
    };

    jobsStore.update(jobs => [nuevo, ...jobs]);

    refsStore.update(refs => refs.map(x => {
      if (x.id !== r.id) return x;
      const vinculadas = cloneArray(x.empresasVinculadas);
      if (nuevo.empresa && !vinculadas.includes(nuevo.empresa)) vinculadas.push(nuevo.empresa);
      return { ...x, empresasVinculadas: vinculadas };
    }));

    closeRefToJob();
    showToast(`Postulación creada desde ${r.nombre}`, '✨');

    setTimeout(() => {
      openEdit(nuevoId);
      document.dispatchEvent(new CustomEvent('scroll-to-job', { detail: { jobId: nuevoId } }));
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
    // Clear the job filter so the target card is visible
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
    onAdvance: (id, opts = {}) => {
      const direction = opts.direction || 'next';
      if (direction === 'next') openNote(id, 'next', opts);
      else applyPrev(id);
    },
    onOpenRefEdit: openRefEdit,
    onRefToJob: openRefToJob,
  };

  // Stepping backward skips the note modal
  function applyPrev(id) {
    const j = jobsStore.get().find(x => x.id === id);
    if (!j) return;
    const idx = stepIndex(j.estado);
    if (idx <= 0) return;
    const nuevoEstado = WORKFLOW_STEPS[idx - 1].id;

    jobsStore.update(jobs => jobs.map(x => {
      if (x.id !== id) return x;
      const history = cloneArray(x.history);
      history.push({ estado: nuevoEstado, fecha: new Date().toISOString() });
      return { ...x, estado: nuevoEstado, history };
    }));
    showToast(`${j.empresa}: ${nuevoEstado}`, '←');
  }
}