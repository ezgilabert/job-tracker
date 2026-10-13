// ============================================================
// Controller: referrals
// ============================================================

import { showToast } from '../ui/toast.js';
import { showConfirm } from '../ui/confirmModal.js';
import { filterRefs, refStepIndex, isRefClosed } from '../selectors.js';
import { REF_WORKFLOW_STEPS } from '../constants.js';
import { renderRefCard } from '../templates/refCard.js';
import { uid, highlightAndScroll, escapeHtml, cloneArray } from '../utils.js';
import { renderDashboard, buildWeeklyTrend, buildDailyActivity } from '../ui/dashboard.js';
import { t, tRefState, tRefStateShort } from '../i18n.js';

/**
 * @param {import('../store.js').Store} jobsStore
 * @param {import('../store.js').Store} refsStore
 * @param {{
 *   onOpenRefEdit:  (id:number)=>void,
 *   onRefToJob:     (refId:number)=>void,
 *   onOpenRefHistory: (id:number)=>void,
 * }} modals
 * @param {import('../store.js').Store} configStore
 */
export function mountRefsController(jobsStore, refsStore, modals, configStore) {
  // ----------------------------------------------------------
  // Local UI state
  // ----------------------------------------------------------
  let currentFilter = 'all';
  let searchTerm = '';

  let relacionChips = null;
  let estadoChips = null;

  // ----------------------------------------------------------
  // Collapsibles
  // ----------------------------------------------------------
  const refFormToggleBtn = document.getElementById('refFormToggleBtn');
  const refFormBody = document.getElementById('refFormBody');
  const refToggleBtn = document.getElementById('refToggleBtn');
  const refsBody = document.getElementById('refsBody');

  if (refFormToggleBtn && refFormBody) {
    refFormToggleBtn.addEventListener('click', () => {
      const collapsed = refFormBody.classList.toggle('collapsed');
      refFormToggleBtn.classList.toggle('collapsed', collapsed);
    });
  }

  if (refToggleBtn && refsBody) {
    refToggleBtn.addEventListener('click', () => {
      const collapsed = refsBody.classList.toggle('collapsed');
      refToggleBtn.classList.toggle('collapsed', collapsed);
    });
  }

  function expandRefForm() {
    if (refFormBody && refFormBody.classList.contains('collapsed')) {
      refFormBody.classList.remove('collapsed');
      refFormToggleBtn.classList.remove('collapsed');
    }
  }

  function expandRefsList() {
    if (refsBody && refsBody.classList.contains('collapsed')) {
      refsBody.classList.remove('collapsed');
      refToggleBtn.classList.remove('collapsed');
    }
  }

  // ----------------------------------------------------------
  // Dashboard
  // ----------------------------------------------------------
  function renderRefsDash() {
    const container = document.getElementById('refsDashboard');
    if (!container) return;

    const refs = refsStore.get();
    const cfg = configStore.get();
    const style = cfg.dashboardStyleRefs || cfg.dashboardStyle || 'sparklines';

    const total = refs.length;
    const activos = refs.filter(r => !isRefClosed(r.estado)).length;
    const contratados = refs.filter(r => r.estado === 'Contratado').length;
    const noAplica = refs.filter(r => r.estado === 'No aplica').length;
    const enProceso = refs.filter(r => r.estado === 'En proceso').length;
    const tasaConv = total ? Math.round((contratados / total) * 100) : 0;

    const relCount = {};
    refs.forEach(r => {
      if (!r.relacion) return;
      const list = Array.isArray(r.relacion) ? r.relacion : [r.relacion];
      list.forEach(rel => {
        if (!rel) return;
        relCount[rel] = (relCount[rel] || 0) + 1;
      });
    });
    const top = Object.entries(relCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const getDate = r => r.createdAt || r.fecha || '';
    const trendTotal = buildWeeklyTrend(refs, getDate);
    const trendActive = buildWeeklyTrend(refs.filter(r => !isRefClosed(r.estado)), getDate);
    const trendHighlight = buildWeeklyTrend(refs.filter(r => r.estado === 'Contratado'), getDate);
    const trendClosed = buildWeeklyTrend(refs.filter(r => r.estado === 'No aplica'), getDate);

    const heatmap = buildDailyActivity(refs, getDate, 60);

    renderDashboard(container, {
      style,
      kind: 'refs',
      icon: '🤝',
      label: t('refs.title'),
      total,
      active: activos,
      inProcess: enProceso,
      closed: noAplica,
      highlight: contratados,
      highlightIcon: '🎉',
      highlightLabel: t('dash.refs.highlight'),
      highlightSub: t('dash.refs.highlightSub', { pct: tasaConv }),
      labels: {
        total: t('dash.refs.total'),
        active: t('dash.refs.active'),
        inProcess: t('dash.refs.inProcess'),
        closed: t('dash.refs.closed'),
      },
      trend: {
        total: trendTotal,
        active: trendActive,
        highlight: trendHighlight,
        closed: trendClosed,
      },
      heatmap,
      topLabel: t('dash.refs.top'),
      topIcon: '🤝',
      top,
      summary: t('dash.refs.summary', {
        total,
        totalWord: t(total === 1
          ? 'dash.refs.summaryWord.total.one'
          : 'dash.refs.summaryWord.total.many'),
        active: activos,
        activeWord: t(activos === 1
          ? 'dash.refs.summaryWord.active.one'
          : 'dash.refs.summaryWord.active.many'),
        highlight: contratados,
        highlightWord: t(contratados === 1
          ? 'dash.refs.summaryWord.highlight.one'
          : 'dash.refs.summaryWord.highlight.many'),
      }),
    });
  }

  configStore.subscribe(renderRefsDash);

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  function renderRefs() {
    const refs = refsStore.get();
    const jobs = jobsStore.get();

    document.getElementById('refCounter').textContent = refs.length;

    renderRefsDash();

    const filtered = filterRefs(refs, currentFilter, searchTerm);
    const list = document.getElementById('refList');

    if (filtered.length === 0) {
      const noRefsAtAll = refs.length === 0;

      list.innerHTML = noRefsAtAll
        ? renderEmptyRefs(t('empty.refs.title'), t('empty.refs.subtitle'))
        : renderEmptyFilter(t('empty.refs.filter.title'), t('empty.refs.filter.subtitle'));
      return;
    }

    list.innerHTML = filtered
      .map(r => renderRefCard(r, { jobs }))
      .join('');
  }

  // ----------------------------------------------------------
  // Empty states (helpers)
  // ----------------------------------------------------------
  function renderEmptyRefs(title, subtitle) {
    return `
      <div class="empty-ref">
        <div class="empty-ref-visual">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(subtitle)}</p>
      </div>
    `;
  }

  function renderEmptyFilter(title, subtitle) {
    return `
      <div class="empty-filter">
        <div class="empty-filter-visual">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 4h16l-6 8v6l-4 2v-8L4 4z"/>
          </svg>
        </div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(subtitle)}</p>
      </div>
    `;
  }

  refsStore.subscribe(renderRefs);
  jobsStore.subscribe(renderRefs);

  // ----------------------------------------------------------
  // Chips
  // ----------------------------------------------------------
  function initChips(relacion, estado) {
    relacionChips = relacion;
    estadoChips = estado;
    relacionChips.setValue([]);
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
    const relacionValue = relacionChips?.getValue() || [];
    const now = new Date().toISOString();

    const newRef = {
      id: uid(),
      nombre,
      rol: valueOf('refRol'),
      contacto: valueOf('refContacto'),
      link: valueOf('refLink'),
      relacion: Array.isArray(relacionValue) ? relacionValue : [],
      estado: initialState,
      // Campos internos: los setea el flow de "Referido hecho" (refToJob).
      empresasVinculadas: [],
      linkedJobId: null,
      notas: valueOf('refNotas'),
      volvioAtras: false,
      createdAt: now,
      history: [{ estado: initialState, fecha: now }],
    };

    refsStore.update(refs => [newRef, ...refs]);

    refForm.reset();
    relacionChips?.setValue([]);
    estadoChips?.setValue('Pendiente');

    // Expandimos la lista y colapsamos el form
    expandRefsList();
    if (refFormBody && refFormToggleBtn) {
      refFormBody.classList.add('collapsed');
      refFormToggleBtn.classList.add('collapsed');
    }

    showToast(t('toast.refAdded'), '✓');
  });

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

    if (nextState === 'Contratado' && r.linkedJobId) {
      syncLinkedJobToOffer(r.linkedJobId, r.nombre);
    }

    if (nextState === 'En proceso' && prevState !== 'En proceso') {
      setTimeout(() => modals.onRefToJob(id), 400);
    }
  }

  function syncLinkedJobToOffer(jobId, refName) {
    jobsStore.update(jobs => jobs.map(j => {
      if (j.id !== jobId) return j;
      if (j.estado === 'Oferta') return j;
      const history = cloneArray(j.history);
      history.push({
        estado: 'Oferta',
        fecha: new Date().toISOString(),
        motivo: `Referido contratado: ${refName}`,
      });
      return { ...j, estado: 'Oferta', history };
    }));
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

    if (r.linkedJobId) {
      showToast(t('ref.lockedBackTitle'), '🔒');
      return;
    }

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

    // Aseguramos que la lista esté visible
    expandRefsList();

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
  // i18n
  // ----------------------------------------------------------
  document.addEventListener('i18n-changed', () => {
    renderRefsDash();
    renderRefs();
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