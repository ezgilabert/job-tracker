// ============================================================
// Controller: referrals
// ============================================================

import { showToast } from '../ui/feedback/toast.js';
import { showConfirm } from '../ui/feedback/confirmModal.js';
import {
  filterRefs, refStepIndex, isRefClosed,
  topByCount, buildWeeklyTrend, buildDailyActivity,
} from '../app/selectors.js';
import { REF_WORKFLOW_STEPS } from '../app/constants.js';
import { renderRefCard } from '../templates/refCard.js';
import { uid, highlightAndScroll, escapeHtml, cloneArray, valueOf } from '../app/utils.js';
import { renderDashboard } from '../ui/dashboard.js';
import { t, tRefState, tRefStateShort } from '../i18n/index.js';
import { scrollToJob, onScrollToRef, onI18nChanged } from '../app/events.js';
import { withUndo } from '../app/undo.js';

/**
 * @param {import('../app/store.js').Store} jobsStore
 * @param {import('../app/store.js').Store} refsStore
 * @param {{
 *   onOpenRefEdit:   (id:number)=>void,
 *   onRefToJob:      (refId:number)=>void,
 *   onOpenRefHistory:(id:number)=>void,
 * }} modals
 * @param {import('../app/store.js').Store} configStore
 */
export function mountRefsController(jobsStore, refsStore, modals, configStore) {
  // ----------------------------------------------------------
  // Local UI state
  // ----------------------------------------------------------
  let currentFilter = 'all';
  let searchTerm = '';

  let relationshipChips = null;
  let statusChips = null;

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
    const active = refs.filter(r => !isRefClosed(r.status)).length;
    const hired = refs.filter(r => r.status === 'Hired').length;
    const notApplicable = refs.filter(r => r.status === 'Not Applicable').length;
    const inProcess = refs.filter(r => r.status === 'In Process').length;
    const conversionRate = total ? Math.round((hired / total) * 100) : 0;

    const top = topByCount(refs, r => r.relationship);

    const getDate = r => r.createdAt || r.date || '';
    const trendTotal = buildWeeklyTrend(refs, getDate);
    const trendActive = buildWeeklyTrend(refs.filter(r => !isRefClosed(r.status)), getDate);
    const trendHighlight = buildWeeklyTrend(refs.filter(r => r.status === 'Hired'), getDate);
    const trendClosed = buildWeeklyTrend(refs.filter(r => r.status === 'Not Applicable'), getDate);

    const heatmap = buildDailyActivity(refs, getDate, 60);

    renderDashboard(container, {
      style,
      kind: 'refs',
      icon: '🤝',
      label: t('refs.title'),
      total,
      active,
      inProcess,
      closed: notApplicable,
      highlight: hired,
      highlightIcon: '🎉',
      highlightLabel: t('dash.refs.highlight'),
      highlightSub: t('dash.refs.highlightSub', { pct: conversionRate }),
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
        active,
        activeWord: t(active === 1
          ? 'dash.refs.summaryWord.active.one'
          : 'dash.refs.summaryWord.active.many'),
        highlight: hired,
        highlightWord: t(hired === 1
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
  // Empty states
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
  function initChips(relationship, status) {
    relationshipChips = relationship;
    statusChips = status;
    relationshipChips.setValue([]);
    statusChips.setValue('Pending');
  }

  // ----------------------------------------------------------
  // Create form
  // ----------------------------------------------------------
  const refForm = document.getElementById('refForm');
  refForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = valueOf('refName');
    if (!name) return;

    const initialState = statusChips?.getValue() || 'Pending';
    const relationshipValue = relationshipChips?.getValue() || [];
    const now = new Date().toISOString();

    const newRef = {
      id: uid(),
      name,
      role: valueOf('refRole'),
      contact: valueOf('refContact'),
      link: valueOf('refLink'),
      relationship: Array.isArray(relationshipValue) ? relationshipValue : [],
      status: initialState,
      linkedCompanies: [],
      linkedJobId: null,
      notes: valueOf('refNotes'),
      wentBack: false,
      createdAt: now,
      history: [{ status: initialState, date: now }],
    };

    refsStore.update(refs => [newRef, ...refs]);

    refForm.reset();
    relationshipChips?.setValue([]);
    statusChips?.setValue('Pending');

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
      case 'edit-ref':      modals.onOpenRefEdit(id);   break;
      case 'delete-ref':    confirmDelete(id);          break;
      case 'move-ref-next': requestMoveNext(id);        break;
      case 'move-ref-prev': requestMovePrev(id);        break;
      case 'close-ref':     closeRef(id);               break;
      case 'reopen-ref':    reopenRef(id);              break;
      case 'ref-history':   modals.onOpenRefHistory(id); break;
      case 'scroll-to-job': scrollToJob(Number(actionEl.dataset.jobId)); break;
    }
  });

  async function confirmDelete(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    const confirmed = await showConfirm({
      title: t('confirm.deleteRef.title', { name: r.name }),
      message: t('confirm.deleteRef.message'),
      confirmText: t('confirm.deleteRef.confirm'),
      danger: true,
    });
    if (!confirmed) return;

    withUndo(
      refsStore,
      t('toast.refDeleted'),
      () => refsStore.update(refs => refs.filter(x => x.id !== id)),
      '🗑️'
    );
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
    if (!r || isRefClosed(r.status)) return;

    const idx = refStepIndex(r.status);
    if (idx < 0) return;

    const nextIdx = idx + 1;
    if (nextIdx >= REF_WORKFLOW_STEPS.length) return;

    const step = REF_WORKFLOW_STEPS[nextIdx];
    pendingRefAdvance = { id, nextStatus: step.id };

    refNoteSubtitle.innerHTML = t('note.subtitle', {
      step: escapeHtml(tRefStateShort(step.id)),
      name: escapeHtml(r.name),
    });

    refStepNoteInput.value = '';
    refNoteModal.classList.add('open');
    setTimeout(() => refStepNoteInput.focus(), 80);
  }

  function applyRefAdvance({ note } = {}) {
    if (!pendingRefAdvance) return;
    const { id, nextStatus } = pendingRefAdvance;

    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    const prevStatus = r.status;

    withUndo(
      [refsStore, jobsStore],
      t('toast.advanceTo', { name: r.name, status: tRefState(nextStatus) }),
      () => {
        refsStore.update(refs => refs.map(x => {
          if (x.id !== id) return x;
          const history = cloneArray(x.history);
          const entry = { status: nextStatus, date: new Date().toISOString() };
          if (note) entry.note = note;
          history.push(entry);
          return { ...x, status: nextStatus, history };
        }));

        if (nextStatus === 'Hired' && r.linkedJobId) {
          syncLinkedJobToOffer(r.linkedJobId, r.name);
        }
      },
      '→'
    );

    if (nextStatus === 'In Process' && prevStatus !== 'In Process') {
      setTimeout(() => modals.onRefToJob(id), 400);
    }
  }

  function syncLinkedJobToOffer(jobId, refName) {
    jobsStore.update(jobs => jobs.map(j => {
      if (j.id !== jobId) return j;
      if (j.status === 'Offer') return j;
      const history = cloneArray(j.history);
      history.push({
        status: 'Offer',
        date: new Date().toISOString(),
        reason: `Referral hired: ${refName}`,
      });
      return { ...j, status: 'Offer', history };
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
  // Backtrack: confirm, once per referral
  // ----------------------------------------------------------
  async function requestMovePrev(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r || isRefClosed(r.status)) return;

    if (r.linkedJobId) {
      showToast(t('ref.lockedBackTitle'), '🔒');
      return;
    }

    if (r.wentBack) {
      showToast(t('toast.alreadyWentBackRef'), '!');
      return;
    }

    const idx = refStepIndex(r.status);
    if (idx <= 0) return;

    const prevStep = REF_WORKFLOW_STEPS[idx - 1];

    const confirmed = await showConfirm({
      title: t('confirm.prevRef.title'),
      message: t('confirm.prevRef.message', {
        name: escapeHtml(r.name),
        from: escapeHtml(tRefState(r.status)),
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
    if (r.wentBack) return;

    const idx = refStepIndex(r.status);
    if (idx <= 0) return;

    const prevStatus = REF_WORKFLOW_STEPS[idx - 1].id;

    refsStore.update(refs => refs.map(x => {
      if (x.id !== id) return x;
      const history = cloneArray(x.history);
      history.push({
        status: prevStatus,
        date: new Date().toISOString(),
        wentBack: true,
      });
      return { ...x, status: prevStatus, wentBack: true, history };
    }));

    showToast(t('toast.backTo', { name: r.name, status: tRefState(prevStatus) }), '←');
  }

  // ----------------------------------------------------------
  // Close / reopen
  // ----------------------------------------------------------
  async function closeRef(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    const confirmed = await showConfirm({
      title: t('confirm.closeRef.title', { name: r.name }),
      message: t('confirm.closeRef.message'),
      confirmText: t('confirm.closeRef.confirm'),
      danger: true,
    });
    if (!confirmed) return;

    withUndo(
      refsStore,
      t('toast.refClosed', { name: r.name }),
      () => refsStore.update(refs => refs.map(x => {
        if (x.id !== id) return x;
        const history = cloneArray(x.history);
        history.push({
          status: 'Not Applicable',
          date: new Date().toISOString(),
          reason: 'Not applicable',
        });
        return { ...x, status: 'Not Applicable', history };
      })),
      '🚫'
    );
  }

  function reopenRef(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;

    refsStore.update(refs => refs.map(x => {
      if (x.id !== id) return x;
      const history = cloneArray(x.history);
      history.push({
        status: 'Pending',
        date: new Date().toISOString(),
        reason: 'Reopen',
      });
      return { ...x, status: 'Pending', history };
    }));

    showToast(t('toast.refReopened'), '↻');
  }

  // ----------------------------------------------------------
  // scroll-to-ref (from jobsController)
  // ----------------------------------------------------------
  onScrollToRef((e) => {
    const { refId } = e.detail;

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
  onI18nChanged(() => {
    renderRefsDash();
    renderRefs();
  });

  return { renderRefs, initChips };
}