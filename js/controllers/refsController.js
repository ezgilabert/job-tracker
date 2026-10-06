// ============================================================
// Controller: referrals
// ============================================================

import { showToast } from '../ui/toast.js';
import { showConfirm } from '../ui/confirmModal.js';
import { filterRefs, refStepIndex, isRefClosed } from '../selectors.js';
import { REF_WORKFLOW_STEPS } from '../constants.js';
import { renderRefCard } from '../templates/refCard.js';
import { uid, highlightAndScroll, escapeHtml, cloneArray } from '../utils.js';
import { renderCompanyChips, mountCompanyChips } from '../ui/empresasChips.js';
import { t, tRefState, tRefStateShort } from '../i18n.js';

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
  let selectedCompanies = new Set();

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
            ${escapeHtml(refs.length === 0 ? t('empty.refs.title') : t('empty.refs.filter.title'))}
          </h3>
          <p style="font-size: 0.85rem;">
            ${escapeHtml(refs.length === 0 ? t('empty.refs.subtitle') : t('empty.refs.filter.subtitle'))}
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

    const initialState = estadoChips?.getValue() || 'Pendiente';
    const now = new Date().toISOString();

    const newRef = {
      id: uid(),
      nombre,
      rol: valueOf('refRol'),
      contacto: valueOf('refContacto'),
      link: valueOf('refLink'),
      relacion: relacionChips?.getValue() || 'Conocido',
      estado: initialState,
      empresasVinculadas: [...selectedCompanies],
      notas: valueOf('refNotas'),
      volvioAtras: false,
      createdAt: now,
      history: [{ estado: initialState, fecha: now }],
    };

    refsStore.update(refs => [newRef, ...refs]);

    refForm.reset();
    relacionChips?.setValue(null);
    estadoChips?.setValue('Pendiente');
    selectedCompanies = new Set();
    const companies = [...new Set(jobsStore.get().map(j => j.empresa).filter(Boolean))];
    renderCompanyChips(
      document.getElementById('refEmpresasWrap'),
      selectedCompanies,
      companies
    );

    showToast(t('toast.refAdded'), '✓');
  });

  // ----------------------------------------------------------
  // Linked companies
  // ----------------------------------------------------------
  mountCompanyChips(document.getElementById('refEmpresasWrap'), selectedCompanies);

  jobsStore.subscribe(() => {
    const companies = [...new Set(jobsStore.get().map(j => j.empresa).filter(Boolean))];
    renderCompanyChips(
      document.getElementById('refEmpresasWrap'),
      selectedCompanies,
      companies
    );
  });

  const companies = [...new Set(jobsStore.get().map(j => j.empresa).filter(Boolean))];
  renderCompanyChips(
    document.getElementById('refEmpresasWrap'),
    selectedCompanies,
    companies
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
      title: t('confirm.deleteRef.title', { name: r.nombre }),
      message: t('confirm.deleteRef.message'),
      confirmText: t('confirm.deleteRef.confirm'),
      danger: true,
    });
    if (!confirmed) return;
    refsStore.update(refs => refs.filter(x => x.id !== id));
    showToast(t('toast.refDeleted'), '🗑️');
  }

  // ----------------------------------------------------------
  // Advance: with note modal
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
    pendingRefAdvance = { id, nextState: step.id };

    refNoteSubtitle.innerHTML = t('note.subtitle', {
      step: escapeHtml(tRefStateShort(step.id)),
      name: escapeHtml(r.nombre),
    });

    refStepNoteInput.value = '';
    refNoteModal.classList.add('open');
    setTimeout(() => refStepNoteInput.focus(), 80);
  }

  function applyRefAdvance({ note } = {}) {
    if (!pendingRefAdvance) return;
    const { id, nextState } = pendingRefAdvance;

    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    const prevState = r.estado;

    refsStore.update(refs => refs.map(x => {
      if (x.id !== id) return x;
      const history = cloneArray(x.history);
      const entry = { estado: nextState, fecha: new Date().toISOString() };
      if (note) entry.nota = note;
      history.push(entry);
      return { ...x, estado: nextState, history };
    }));

    showToast(t('toast.advanceTo', { name: r.nombre, estado: tRefState(nextState) }), '→');

    if (nextState === 'Referido hecho' && prevState !== 'Referido hecho') {
      setTimeout(() => modals.onRefToJob(id), 400);
    }
  }

  function hideRefNote() {
    refNoteModal.classList.remove('open');
    pendingRefAdvance = null;
  }

  document.getElementById('skipRefNote').addEventListener('click', () => {
    applyRefAdvance({ note: null });
    hideRefNote();
  });

  document.getElementById('saveRefNote').addEventListener('click', () => {
    applyRefAdvance({ note: refStepNoteInput.value.trim() || null });
    hideRefNote();
  });

  document.getElementById('closeRefNoteModal').addEventListener('click', hideRefNote);

  refNoteModal.addEventListener('click', (e) => {
    if (e.target === refNoteModal) {
      applyRefAdvance({ note: null });
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
      showToast(t('toast.alreadyWentBackRef'), '!');
      return;
    }

    const idx = refStepIndex(r.estado);
    if (idx <= 0) return;

    const prevStep = REF_WORKFLOW_STEPS[idx - 1];

    const confirmed = await showConfirm({
      title: t('confirm.prevRef.title'),
      message: t('confirm.prevRef.message', {
        name: escapeHtml(r.nombre),
        from: escapeHtml(tRefState(r.estado)),
        to: escapeHtml(tRefStateShort(prevStep.id)),
      }),
      confirmText: t('confirm.prevRef.confirm'),
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

    const prevState = REF_WORKFLOW_STEPS[idx - 1].id;

    refsStore.update(refs => refs.map(x => {
      if (x.id !== id) return x;
      const history = cloneArray(x.history);
      history.push({
        estado: prevState,
        fecha: new Date().toISOString(),
        retroceso: true,
      });
      return { ...x, estado: prevState, volvioAtras: true, history };
    }));

    showToast(t('toast.backTo', { name: r.nombre, estado: tRefState(prevState) }), '←');
  }

  // ----------------------------------------------------------
  // Close / Reopen
  // ----------------------------------------------------------
  async function closeRef(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    const confirmed = await showConfirm({
      title: t('confirm.closeRef.title', { name: r.nombre }),
      message: t('confirm.closeRef.message'),
      confirmText: t('confirm.closeRef.confirm'),
      danger: true,
    });
    if (!confirmed) return;

    refsStore.update(refs => refs.map(x => {
      if (x.id !== id) return x;
      const history = cloneArray(x.history);
      history.push({
        estado: 'No aplica',
        fecha: new Date().toISOString(),
        motivo: 'No aplica',
      });
      return { ...x, estado: 'No aplica', history };
    }));

    showToast(t('toast.refClosed', { name: r.nombre }), '🚫');
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
        motivo: 'Reopen',
      });
      return { ...x, estado: 'Pendiente', history };
    }));

    showToast(t('toast.refReopened'), '↻');
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
    else showToast(t('toast.refNotFound'), '!');
  });

  // ----------------------------------------------------------
  // i18n: re-render on language change
  // ----------------------------------------------------------
  document.addEventListener('i18n-changed', renderRefs);

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------
  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  return { renderRefs, initChips };
}