// ============================================================
// Controller: referrals
// - create form
// - filters + search
// - section toggle
// - event delegation on #refList
// - listens for 'scroll-to-ref' from jobsController
// - limited backtracking to once per referral (with confirmation)
// - note on advance (same as applications)
// - complete history per referral
// ============================================================

import { showToast } from '../ui/toast.js';
import { showConfirm } from '../ui/confirmModal.js';
import { filterRefs, refStepIndex, isRefClosed } from '../selectors.js';
import { REF_WORKFLOW_STEPS } from '../constants.js';
import { renderRefCard } from '../templates/refCard.js';
import { uid, highlightAndScroll, escapeHtml, cloneArray } from '../utils.js';
import { renderEmpresasChips, mountEmpresasChips } from '../ui/empresasChips.js';

/**
 * @param {import('../store.js').Store} jobsStore
 * @param {import('../store.js').Store} refsStore
 * @param {{
 *   onOpenRefEdit:  (id:number)=>void,
 *   onRefToJob:     (refId:number)=>void,
 *   onOpenRefHistory: (id:number)=>void,
 * }} modals
 */
export function mountRefsController(jobsStore, refsStore, modals) {
  // ----------------------------------------------------------
  // Local UI state
  // ----------------------------------------------------------
  let currentFilter = 'all';
  let searchTerm = '';
  let selectedEmpresas = new Set();

  let relacionChips = null;
  let estadoChips = null;

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  function renderRefs() {
    const refs = refsStore.get();
    const jobs = jobsStore.get();

    document.getElementById('refCounter').textContent = refs.length;

    const filtered = filterRefs(refs, currentFilter, searchTerm);
    const list = document.getElementById('refList');

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty" style="padding: 2.5rem 1rem;">
          <div class="empty-icon" style="font-size: 2.2rem;">🤝</div>
          <h3 style="font-size: 1rem;">
            ${refs.length === 0 ? 'Todavía no cargaste referidos' : 'Sin resultados'}
          </h3>
          <p style="font-size: 0.85rem;">
            ${refs.length === 0 ? 'Agregá a alguien que te pueda recomendar' : 'Probá con otro filtro o búsqueda'}
          </p>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered
      .map(r => renderRefCard(r, { jobs }))
      .join('');
  }

  refsStore.subscribe(renderRefs);
  jobsStore.subscribe(renderRefs);

  // ----------------------------------------------------------
  // Chips
  // ----------------------------------------------------------
  function initChips(relacion, estado) {
    relacionChips = relacion;
    estadoChips = estado;
    relacionChips.setValue(null);
    estadoChips.setValue('Pendiente');
  }

  // ----------------------------------------------------------
  // Create form
  // ----------------------------------------------------------
  const refForm = document.getElementById('refForm');
  refForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const nombre = valueOf('refNombre');
    if (!nombre) return;

    const estadoInicial = estadoChips?.getValue() || 'Pendiente';
    const now = new Date().toISOString();

    const nuevo = {
      id: uid(),
      nombre,
      rol: valueOf('refRol'),
      contacto: valueOf('refContacto'),
      link: valueOf('refLink'),
      relacion: relacionChips?.getValue() || 'Conocido',
      estado: estadoInicial,
      empresasVinculadas: [...selectedEmpresas],
      notas: valueOf('refNotas'),
      volvioAtras: false,
      createdAt: now,
      history: [{ estado: estadoInicial, fecha: now }],
    };

    refsStore.update(refs => [nuevo, ...refs]);

    refForm.reset();
    relacionChips?.setValue(null);
    estadoChips?.setValue('Pendiente');
    selectedEmpresas = new Set();
    const empresas = [...new Set(jobsStore.get().map(j => j.empresa).filter(Boolean))];
    renderEmpresasChips(
      document.getElementById('refEmpresasWrap'),
      selectedEmpresas,
      empresas
    );

    showToast('Referido agregado', '✓');
  });

  // ----------------------------------------------------------
  // Linked companies
  // ----------------------------------------------------------
  mountEmpresasChips(document.getElementById('refEmpresasWrap'), selectedEmpresas);

  jobsStore.subscribe(() => {
    const empresas = [...new Set(jobsStore.get().map(j => j.empresa).filter(Boolean))];
    renderEmpresasChips(
      document.getElementById('refEmpresasWrap'),
      selectedEmpresas,
      empresas
    );
  });

  const empresas = [...new Set(jobsStore.get().map(j => j.empresa).filter(Boolean))];
  renderEmpresasChips(
    document.getElementById('refEmpresasWrap'),
    selectedEmpresas,
    empresas
  );

  // ----------------------------------------------------------
  // Search and filters
  // ----------------------------------------------------------
  document.getElementById('refSearch').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderRefs();
  });

  document.getElementById('refFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('#refFilters button').forEach(b =>
      b.classList.toggle('active', b === btn)
    );
    renderRefs();
  });

  // ----------------------------------------------------------
  // Section toggle
  // ----------------------------------------------------------
  const refToggleBtn = document.getElementById('refToggleBtn');
  const referidosBody = document.getElementById('referidosBody');
  refToggleBtn.style.transition = 'transform 0.3s ease';

  refToggleBtn.addEventListener('click', () => {
    const collapsed = referidosBody.classList.toggle('collapsed');
    refToggleBtn.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0)';
  });

  // ----------------------------------------------------------
  // #refList delegation
  // ----------------------------------------------------------
  const refList = document.getElementById('refList');

  refList.addEventListener('click', (e) => {
    const card = e.target.closest('.referido');
    if (!card) return;

    const id = Number(card.dataset.id);
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;

    switch (action) {
      case 'edit-ref':         modals.onOpenRefEdit(id);   break;
      case 'delete-ref':       confirmDelete(id);          break;
      case 'move-ref-next':    requestMoveNext(id);        break;
      case 'move-ref-prev':    requestMovePrev(id);        break;
      case 'close-ref':        closeRef(id);               break;
      case 'reopen-ref':       reopenRef(id);              break;
      case 'ref-history':      modals.onOpenRefHistory(id); break;
      case 'scroll-to-job':    scrollToJob(Number(actionEl.dataset.jobId)); break;
    }
  });

  async function confirmDelete(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    const confirmed = await showConfirm({
      title: `¿Borrar a ${r.nombre}?`,
      message: 'Se eliminará de tu lista de referidos.',
      confirmText: 'Borrar',
      danger: true,
    });
    if (!confirmed) return;
    refsStore.update(refs => refs.filter(x => x.id !== id));
    showToast('Referido borrado', '🗑️');
  }

  // ----------------------------------------------------------
  // Advance: with note modal (like applications)
  // ----------------------------------------------------------
  const refNoteModal = document.getElementById('refNoteModal');
  const refStepNoteInput = document.getElementById('refStepNoteInput');
  const refNoteSubtitle = document.getElementById('refNoteModalSubtitle');
  let pendingRefAdvance = null;

  function requestMoveNext(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r || isRefClosed(r.estado)) return;

    const idx = refStepIndex(r.estado);
    if (idx < 0) return;

    const nextIdx = idx + 1;
    if (nextIdx >= REF_WORKFLOW_STEPS.length) return;

    const step = REF_WORKFLOW_STEPS[nextIdx];
    pendingRefAdvance = { id, nuevoEstado: step.id };

    refNoteSubtitle.innerHTML =
      `Vas a pasar a <strong>${escapeHtml(step.short)}</strong> en <strong>${escapeHtml(r.nombre)}</strong>. ¿Querés dejar un recordatorio para esta etapa?`;

    refStepNoteInput.value = '';
    refNoteModal.classList.add('open');
    setTimeout(() => refStepNoteInput.focus(), 80);
  }

  function applyRefAdvance({ nota } = {}) {
    if (!pendingRefAdvance) return;
    const { id, nuevoEstado } = pendingRefAdvance;

    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    const prevEstado = r.estado;

    refsStore.update(refs => refs.map(x => {
      if (x.id !== id) return x;
      const history = cloneArray(x.history);
      const entry = { estado: nuevoEstado, fecha: new Date().toISOString() };
      if (nota) entry.nota = nota;
      history.push(entry);
      return { ...x, estado: nuevoEstado, history };
    }));

    showToast(`${r.nombre}: ${nuevoEstado}`, '→');

    if (nuevoEstado === 'Referido hecho'
        && prevEstado !== 'Referido hecho') {
      setTimeout(() => modals.onRefToJob(id), 400);
    }
  }

  function hideRefNote() {
    refNoteModal.classList.remove('open');
    pendingRefAdvance = null;
  }

  document.getElementById('skipRefNote').addEventListener('click', () => {
    applyRefAdvance({ nota: null });
    hideRefNote();
  });

  document.getElementById('saveRefNote').addEventListener('click', () => {
    applyRefAdvance({ nota: refStepNoteInput.value.trim() || null });
    hideRefNote();
  });

  document.getElementById('closeRefNoteModal').addEventListener('click', hideRefNote);

  refNoteModal.addEventListener('click', (e) => {
    if (e.target === refNoteModal) {
      applyRefAdvance({ nota: null });
      hideRefNote();
    }
  });

  // ----------------------------------------------------------
  // Backtrack: with confirmation, only once per referral
  // ----------------------------------------------------------
  async function requestMovePrev(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r || isRefClosed(r.estado)) return;

    if (r.volvioAtras) {
      showToast('Ya volviste atrás una vez en este referido', '!');
      return;
    }

    const idx = refStepIndex(r.estado);
    if (idx <= 0) return;

    const prevStep = REF_WORKFLOW_STEPS[idx - 1];

    const confirmed = await showConfirm({
      title: '¿Volver a la etapa anterior?',
      message:
        `Vas a retroceder a <strong>${escapeHtml(r.nombre)}</strong> ` +
        `de <strong>${escapeHtml(r.estado)}</strong> a <strong>${escapeHtml(prevStep.short)}</strong>.<br>` +
        `<span style="color:var(--danger-2);font-size:0.82rem;font-weight:600;">` +
        `⚠️ Solo podés volver atrás una vez por referido.</span>`,
      confirmText: 'Sí, volver',
    });

    if (!confirmed) return;
    applyMovePrev(id);
  }

  function applyMovePrev(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    if (r.volvioAtras) return;

    const idx = refStepIndex(r.estado);
    if (idx <= 0) return;

    const nuevoEstado = REF_WORKFLOW_STEPS[idx - 1].id;

    refsStore.update(refs => refs.map(x => {
      if (x.id !== id) return x;
      const history = cloneArray(x.history);
      history.push({
        estado: nuevoEstado,
        fecha: new Date().toISOString(),
        retroceso: true,
      });
      return { ...x, estado: nuevoEstado, volvioAtras: true, history };
    }));

    showToast(`${r.nombre}: ${nuevoEstado}`, '←');
  }

  // ----------------------------------------------------------
  // Close / Reopen
  // ----------------------------------------------------------
  async function closeRef(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    const confirmed = await showConfirm({
      title: `¿Marcar a ${r.nombre} como "No aplica"?`,
      message: 'Este referido ya no aplica para tu búsqueda.',
      confirmText: 'Marcar',
      danger: true,
    });
    if (!confirmed) return;

    refsStore.update(refs => refs.map(x => {
      if (x.id !== id) return x;
      const history = cloneArray(x.history);
      history.push({
        estado: 'No aplica',
        fecha: new Date().toISOString(),
        motivo: 'Marcado como No aplica',
      });
      return { ...x, estado: 'No aplica', history };
    }));

    showToast(`${r.nombre}: No aplica`, '🚫');
  }

  function reopenRef(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;

    refsStore.update(refs => refs.map(x => {
      if (x.id !== id) return x;
      const history = cloneArray(x.history);
      history.push({
        estado: 'Pendiente',
        fecha: new Date().toISOString(),
        motivo: 'Reabierto',
      });
      return { ...x, estado: 'Pendiente', history };
    }));

    showToast('Referido reabierto como Pendiente', '↻');
  }

  function scrollToJob(jobId) {
    document.dispatchEvent(new CustomEvent('scroll-to-job', { detail: { jobId } }));
  }

  // ----------------------------------------------------------
  // scroll-to-ref (from jobsController)
  // ----------------------------------------------------------
  document.addEventListener('scroll-to-ref', (e) => {
    const { refId } = e.detail;

    if (referidosBody.classList.contains('collapsed')) {
      referidosBody.classList.remove('collapsed');
      refToggleBtn.style.transform = 'rotate(0)';
    }

    let needsRender = false;
    if (currentFilter !== 'all') {
      currentFilter = 'all';
      document.querySelectorAll('#refFilters button').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === 'all')
      );
      needsRender = true;
    }
    if (searchTerm) {
      searchTerm = '';
      document.getElementById('refSearch').value = '';
      needsRender = true;
    }
    if (needsRender) renderRefs();

    const target = refList.querySelector(`.referido[data-id="${refId}"]`);
    if (target) highlightAndScroll(target);
    else showToast('No se encontró el referido', '!');
  });

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------
  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  return { renderRefs, initChips };
}