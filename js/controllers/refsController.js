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
import {
  uid, highlightAndScroll, escapeHtml, valueOf, updateById, withHistoryEntry,
} from '../app/utils.js';
import { renderDashboard } from '../ui/dashboard.js';
import { createModal } from '../ui/modal.js';
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
  let currentFilter = 'all';
  let searchTerm = '';

  let relationshipChips = null;
  let statusChips = null;

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
      label: t('refs.title'),
      total,
      active,
      inProcess,
      closed: notApplicable,
      highlight: hired,
      highlightIcon: 'icon-user-check',
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
      topIcon: 'icon-users',
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

    // ---- 1. Name (HTML5 blocks empty submits, but keep a
    //         defensive check with a toast for consistency). ----
    const name = (valueOf('refName') || '').trim();
    if (!name) {
      showToast(t('toast.refNameRequired'), 'icon-alert-triangle');
      document.getElementById('refName')?.focus();
      return;
    }

    // ---- 2. Role / Company (required) ----
    const roleValue = (valueOf('refRole') || '').trim();
    if (!roleValue) {
      showToast(t('toast.refRoleRequired'), 'icon-alert-triangle');
      document.getElementById('refRole')?.focus();
      return;
    }

    // ---- 3. Contact OR Link (at least one required) ----
    const contactValue = (valueOf('refContact') || '').trim();
    const linkValue = (valueOf('refLink') || '').trim();
    if (!contactValue && !linkValue) {
      showToast(t('toast.refContactOrLinkRequired'), 'icon-alert-triangle');
      document.getElementById('refContact')?.focus();
      return;
    }

    // ---- 4. Relationship (at least one chip selected) ----
    const relationshipValue = relationshipChips?.getValue() || [];
    if (!Array.isArray(relationshipValue) || relationshipValue.length === 0) {
      showToast(t('toast.refRelationshipRequired'), 'icon-alert-triangle');
      return;
    }

    // ---- 5. Status (defensive — chips have a default of Pending) ----
    const initialState = statusChips?.getValue();
    if (!initialState) {
      showToast(t('toast.refStatusRequired'), 'icon-alert-triangle');
      return;
    }

    const now = new Date().toISOString();

    const newRef = {
      id: uid(),
      name,
      role: roleValue,
      contact: contactValue,
      link: linkValue,
      relationship: [...relationshipValue],
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

    showToast(t('toast.refAdded'), 'icon-check');
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
      'icon-trash'
    );
  }

  // ----------------------------------------------------------
  // Advance: with note modal
  //
  // The "Save and advance" button is disabled until the textarea
  // has at least one non-whitespace character. "Continue without
  // note" is always enabled as the escape hatch.
  // ----------------------------------------------------------
  const refStepNoteInput = document.getElementById('refStepNoteInput');
  const refNoteSubtitle = document.getElementById('refNoteModalSubtitle');
  const refSaveNoteBtn = document.getElementById('saveRefNote');
  let pendingRefAdvance = null;

  const refNoteModal = createModal(document.getElementById('refNoteModal'), {
    onClose: () => { pendingRefAdvance = null; },
  });

  function syncRefSaveButton() {
    refSaveNoteBtn.disabled = refStepNoteInput.value.trim().length === 0;
  }

  refStepNoteInput.addEventListener('input', syncRefSaveButton);

  // Initial state: disabled (in case the textarea starts with content).
  syncRefSaveButton();

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
    syncRefSaveButton();              // ← reset to disabled on open
    refNoteModal.open();
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
        updateById(refsStore, id, x => withHistoryEntry(
          x,
          { status: nextStatus },
          note ? { status: nextStatus, note } : { status: nextStatus }
        ));

        if (nextStatus === 'Hired' && r.linkedJobId) {
          syncLinkedJobToOffer(r.linkedJobId, r.name);
        }
      },
      'icon-arrow-right'
    );

    if (nextStatus === 'In Process' && prevStatus !== 'In Process') {
      setTimeout(() => modals.onRefToJob(id), 400);
    }
  }

  function syncLinkedJobToOffer(jobId, refName) {
    jobsStore.update(jobs => jobs.map(j => {
      if (j.id !== jobId) return j;
      if (j.status === 'Offer') return j;
      return withHistoryEntry(
        j,
        { status: 'Offer' },
        { status: 'Offer', reason: `Referral hired: ${refName}` }
      );
    }));
  }

  document.getElementById('skipRefNote').addEventListener('click', () => {
    applyRefAdvance({ note: null });
    refNoteModal.close();
  });

  document.getElementById('saveRefNote').addEventListener('click', () => {
    // Defensive guard: if something re-enables the button without
    // content (e.g. a future refactor), bail out instead of
    // saving an empty note.
    if (refStepNoteInput.value.trim().length === 0) return;
    applyRefAdvance({ note: refStepNoteInput.value.trim() });
    refNoteModal.close();
  });

  // Closing via the X, overlay click, or Escape cancels the advance.
  document.getElementById('closeRefNoteModal').addEventListener('click', () => refNoteModal.close());

  // ----------------------------------------------------------
  // Backtrack: confirm, once per referral
  // ----------------------------------------------------------
  async function requestMovePrev(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r || isRefClosed(r.status)) return;

    if (r.linkedJobId) {
      showToast(t('ref.lockedBackTitle'), 'icon-lock');
      return;
    }

    if (r.wentBack) {
      showToast(t('toast.alreadyWentBackRef'), 'icon-alert-triangle');
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

    updateById(refsStore, id, x => withHistoryEntry(
      x,
      { status: prevStatus, wentBack: true },
      { status: prevStatus, wentBack: true }
    ));

    showToast(t('toast.backTo', { name: r.name, status: tRefState(prevStatus) }), 'icon-arrow-left');
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
      () => updateById(refsStore, id, x => withHistoryEntry(
        x,
        { status: 'Not Applicable' },
        { status: 'Not Applicable', reason: 'Not applicable' }
      )),
      'icon-ban'
    );
  }

  function reopenRef(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;

    updateById(refsStore, id, x => withHistoryEntry(
      x,
      { status: 'Pending' },
      { status: 'Pending', reason: 'Reopen' }
    ));

    showToast(t('toast.refReopened'), 'icon-rotate-cw');
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
    else showToast(t('toast.refNotFound'), 'icon-alert-triangle');
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