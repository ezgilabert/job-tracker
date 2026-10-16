// ============================================================
// Controller: jobs
// ============================================================

import { showToast } from '../ui/feedback/toast.js';
import { showConfirm } from '../ui/feedback/confirmModal.js';
import { RoleCombo } from '../ui/form/combo.js';
import { StatusCombo } from '../ui/form/statusCombo.js';
import { WorkModePicker } from '../ui/form/workModePicker.js';
import { CurrencyPicker } from '../ui/form/currencyPicker.js';
import { SalaryModeChip, DEFAULT_SALARY_MODE } from '../ui/form/salaryModeChip.js';
import { SalaryInput } from '../ui/form/salaryInput.js';
import { ContactLinkPicker } from '../ui/form/contactLinkPicker.js';
import { renderDashboard } from '../ui/dashboard.js';
import {
  computeStats, filterJobs, sortJobs, isClosed,
  topByCount, buildWeeklyTrend, buildDailyActivity,
} from '../app/selectors.js';
import { WORKFLOW_STEPS, CONFIG_FILTER_META } from '../app/constants.js';
import { renderJobCard } from '../templates/jobCard.js';
import {
  uid, escapeHtml, valueOf, updateById, withHistoryEntry, todayISO,
} from '../app/utils.js';
import { t, tState, tStateShort } from '../i18n/index.js';
import { scrollToRef, onScrollToJob, onI18nChanged } from '../app/events.js';
import { withUndo } from '../app/undo.js';

/**
 * @param {import('../app/store.js').Store} jobsStore
 * @param {import('../app/store.js').Store} refsStore
 * @param {{ onOpenEdit, onClose, onAdvance, onOpenHistory }} modals
 * @param {import('../ui/form/datePicker.js').DatePicker} datePicker
 * @param {import('../app/store.js').Store} configStore
 * @param {{ requestNewRole: (suggested:string)=>Promise<string|null> }} createRoleCtrl
 */
export function mountJobsController(jobsStore, refsStore, modals, datePicker, configStore, createRoleCtrl) {
  let currentFilter = 'all';
  let searchTerm = '';

  // ----------------------------------------------------------
  // Collapsibles
  // ----------------------------------------------------------
  const jobFormToggleBtn = document.getElementById('jobFormToggleBtn');
  const jobFormBody = document.getElementById('jobFormBody');
  const jobsToggleBtn = document.getElementById('jobsToggleBtn');
  const jobsBody = document.getElementById('jobsBody');

  jobFormToggleBtn.addEventListener('click', () => {
    const collapsed = jobFormBody.classList.toggle('collapsed');
    jobFormToggleBtn.classList.toggle('collapsed', collapsed);
  });

  jobsToggleBtn.addEventListener('click', () => {
    const collapsed = jobsBody.classList.toggle('collapsed');
    jobsToggleBtn.classList.toggle('collapsed', collapsed);
  });

  function expandJobs() {
    if (jobsBody.classList.contains('collapsed')) {
      jobsBody.classList.remove('collapsed');
      jobsToggleBtn.classList.remove('collapsed');
    }
  }

  // ----------------------------------------------------------
  // StatusCombo
  // ----------------------------------------------------------
  const statusCombo = new StatusCombo(
    document.getElementById('statusCombo'),
    {
      getStatuses: () => {
        const cfg = configStore.get();
        return cfg.initialStatuses && cfg.initialStatuses.length
          ? cfg.initialStatuses
          : WORKFLOW_STEPS.map(s => s.id);
      },
      getDefault: () => configStore.get().defaultInitialStatus || 'Applied',
      onChange: () => refreshRoleOptionalHint(),
    }
  );

  // ----------------------------------------------------------
  // Dashboard
  // ----------------------------------------------------------
  function renderJobsDash() {
    const container = document.getElementById('jobsDashboard');
    if (!container) return;

    const jobs = jobsStore.get();
    const cfg = configStore.get();
    const style = cfg.dashboardStyleJobs || cfg.dashboardStyle || 'sparklines';

    const stats = computeStats(jobs);
    const offers = stats.offers;
    const active = stats.active;
    const closed = stats.closed;
    const inProcess = stats.inProcess;
    const total = stats.total;
    const successRate = total ? Math.round((offers / total) * 100) : 0;

    const top = topByCount(jobs, j => j.company);

    const getDate = j => j.date || j.createdAt || '';
    const trendTotal = buildWeeklyTrend(jobs, getDate);
    const trendActive = buildWeeklyTrend(jobs.filter(j => !isClosed(j.status)), getDate);
    const trendHighlight = buildWeeklyTrend(jobs.filter(j => j.status === 'Offer'), getDate);
    const trendClosed = buildWeeklyTrend(jobs.filter(j => isClosed(j.status)), getDate);

    const heatmap = buildDailyActivity(jobs, getDate, 60);

    renderDashboard(container, {
      style,
      kind: 'jobs',
      label: t('jobs.title'),
      total,
      active,
      inProcess,
      closed,
      highlight: offers,
      highlightIcon: 'icon-trophy',
      highlightLabel: t('dash.jobs.highlight'),
      highlightSub: t('dash.jobs.highlightSub', { pct: successRate }),
      labels: {
        total: t('dash.jobs.total'),
        active: t('dash.jobs.active'),
        inProcess: t('dash.jobs.inProcess'),
        closed: t('dash.jobs.closed'),
      },
      trend: {
        total: trendTotal,
        active: trendActive,
        highlight: trendHighlight,
        closed: trendClosed,
      },
      heatmap,
      topLabel: t('dash.jobs.top'),
      topIcon: 'icon-building',
      top,
      summary: t('dash.jobs.summary', {
        total,
        totalWord: t(total === 1
          ? 'dash.jobs.summaryWord.total.one'
          : 'dash.jobs.summaryWord.total.many'),
        active,
        activeWord: t(active === 1
          ? 'dash.jobs.summaryWord.active.one'
          : 'dash.jobs.summaryWord.active.many'),
        highlight: offers,
        highlightWord: t(offers === 1
          ? 'dash.jobs.summaryWord.highlight.one'
          : 'dash.jobs.summaryWord.highlight.many'),
      }),
    });
  }

  configStore.subscribe(renderJobsDash);

  // ----------------------------------------------------------
  // Main render
  // ----------------------------------------------------------
  function renderList() {
    const jobs = jobsStore.get();
    const refs = refsStore.get();

    document.getElementById('jobCounter').textContent = jobs.length;

    renderJobsDash();

    const filtered = sortJobs(filterJobs(jobs, currentFilter, searchTerm));
    const list = document.getElementById('list');

    if (filtered.length === 0) {
      const noJobsAtAll = jobs.length === 0;

      list.innerHTML = noJobsAtAll
        ? renderEmptyJobs(t('empty.jobs.title'), t('empty.jobs.subtitle'))
        : renderEmptyFilter(t('empty.jobs.filter.title'), t('empty.jobs.filter.subtitle'));
      return;
    }

    list.innerHTML = filtered
      .map((job, i) => renderJobCard(job, { referrals: refs, index: i }))
      .join('');
  }

  // ----------------------------------------------------------
  // Empty states
  // ----------------------------------------------------------
  function renderEmptyJobs(title, subtitle) {
    return `
      <div class="empty-jobs">
        <div class="empty-jobs-visual">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="8" y="2" width="8" height="4" rx="1"/>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <path d="M9 12h6"/>
            <path d="M9 16h4"/>
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

  jobsStore.subscribe(renderList);
  refsStore.subscribe(renderList);

  // ----------------------------------------------------------
  // Dynamic filters
  // ----------------------------------------------------------
  function getFilterLabel(id) {
    const meta = CONFIG_FILTER_META[id];
    if (meta) return t('filter.' + id);
    const step = WORKFLOW_STEPS.find(s => s.id === id);
    if (step) return tStateShort(id);
    return id;
  }

  function renderFilters() {
    const cfg = configStore.get();
    const filters = (cfg.filters || []).filter(f => f.visible);
    const container = document.getElementById('filters');

    if (!filters.some(f => f.id === currentFilter)) {
      currentFilter = 'all';
    }

    container.innerHTML = filters.map(f => {
      const label = getFilterLabel(f.id);
      const active = f.id === currentFilter ? 'active' : '';
      return `<button data-filter="${escapeHtml(f.id)}" class="${active}">${escapeHtml(label)}</button>`;
    }).join('');
  }

  configStore.subscribe(renderFilters);

  // ----------------------------------------------------------
  // Initial status
  // ----------------------------------------------------------
  function renderInitialStatuses() {
    const def = configStore.get().defaultInitialStatus || 'Applied';
    statusCombo.setValue(def, { silent: true });
  }

  configStore.subscribe(renderInitialStatuses);

  renderFilters();
  renderInitialStatuses();

  // ----------------------------------------------------------
  // Search
  // ----------------------------------------------------------
  const searchInput = document.getElementById('jobSearch');
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderList();
  });

  // ----------------------------------------------------------
  // Work mode + currency + salary controls
  // ----------------------------------------------------------
  const workModePicker = new WorkModePicker(
    document.getElementById('workModePicker'),
    {
      hybridWrap: document.getElementById('hybridDaysWrap'),
      hybridSelect: document.getElementById('hybridOfficeDays'),
    }
  );

  const currencyPicker = new CurrencyPicker(
    document.getElementById('salaryCurrencyChip'),
    { value: 'usd' }
  );

  const salaryLabelEl = document.querySelector('#jobForm .field [data-salary-label]');

  const salaryModeChip = new SalaryModeChip(
    document.getElementById('salaryModeChip'),
    {
      value: DEFAULT_SALARY_MODE,
      fieldLabelEl: salaryLabelEl,
    }
  );

  const hourlySalaryCheckbox = document.getElementById('hourlySalary');

  const salaryInput = new SalaryInput(
    document.getElementById('salary'),
    document.getElementById('salaryHint'),
    {
      getMode: () => salaryModeChip.getValue(),
      getCurrency: () => currencyPicker.getValue(),
      getHourly: () => hourlySalaryCheckbox.checked,
    }
  );

  currencyPicker.onChange = () => salaryInput.reset();
  salaryModeChip.onChange = () => salaryInput.reset();
  hourlySalaryCheckbox.addEventListener('change', () => salaryInput.reset());

  // ----------------------------------------------------------
  // ContactLinkPicker
  // ----------------------------------------------------------
  const contactLinkPicker = new ContactLinkPicker(
    document.getElementById('contactLinkPicker'),
    { value: { platform: 'linkedin', link: '' } }
  );
  contactLinkPicker.translate = t;

  // ----------------------------------------------------------
  // Date default: today.
  // The user can still change it, but it must never end up
  // empty on submit. Set on boot and again after each submit.
  // ----------------------------------------------------------
  if (datePicker) datePicker.setValue(todayISO());

  // ----------------------------------------------------------
  // Form
  // ----------------------------------------------------------
  const form = document.getElementById('jobForm');

  const roleLabel = document.querySelector('label[for="role"]');
  const roleInput = document.getElementById('role');
  const roleOriginalLabel = roleLabel ? roleLabel.textContent : '';

  function refreshRoleOptionalHint() {
    if (!roleLabel) return;
    const isSaved = statusCombo.getValue() === 'Saved';
    roleLabel.dataset.optional = isSaved ? 'true' : 'false';
    roleLabel.textContent = isSaved
      ? `${roleOriginalLabel} (${t('form.role.optional')})`
      : roleOriginalLabel;
  }

  refreshRoleOptionalHint();

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const initialState = statusCombo.getValue();
    const roleValue = (valueOf('role') || '').trim();

    // ---- 1. Role (unless "Saved") ----
    if (!roleValue && initialState !== 'Saved') {
      showToast(t('toast.roleRequired'), 'icon-alert-triangle');
      if (roleInput) roleInput.focus();
      return;
    }

    // ---- 2. Contact link format (if filled) ----
    // Run this before the "link or contact" check so a malformed
    // contact link surfaces its specific error, not the generic one.
    const contactValidation = contactLinkPicker.validate();
    if (!contactValidation.valid) {
      contactLinkPicker.markTouched();
      contactLinkPicker.focus();
      showToast(t(contactValidation.errorKey), 'icon-alert-triangle');
      return;
    }

    // ---- 3. Date required ----
    const dateValue = (datePicker?.getValue() || '').trim();
    if (!dateValue) {
      showToast(t('toast.dateRequired'), 'icon-alert-triangle');
      return;
    }

    // ---- 4. Salary required ----
    const salaryValue = (salaryInput.getValue() || '').trim();
    if (!salaryValue) {
      showToast(t('toast.salaryRequired'), 'icon-alert-triangle');
      document.getElementById('salary')?.focus();
      return;
    }

    // ---- 5. Must have either the job link OR a complete contact ----
    // "Complete contact" = name + a valid contact link (platform
    // already has a default). Notes are excluded on purpose.
    const linkValue = (valueOf('link') || '').trim();
    const contactNameValue = (valueOf('contact') || '').trim();
    const contactData = contactLinkPicker.getValue();
    const contactLinkValue = (contactData.link || '').trim();

    const hasLink = Boolean(linkValue);
    const hasFullContact = Boolean(contactNameValue) && Boolean(contactLinkValue);

    if (!hasLink && !hasFullContact) {
      showToast(t('toast.linkOrContactRequired'), 'icon-alert-triangle');
      document.getElementById('link')?.focus();
      return;
    }

    // ---- Build the new job ----
    const mode = workModePicker.getValue();
    const salaryMode = salaryModeChip.getValue();

    const newJob = {
      id: uid(),
      company: valueOf('company'),
      role: roleValue,
      date: dateValue,
      status: initialState,
      link: linkValue,
      salary: salaryValue,
      hourlySalary: hourlySalaryCheckbox.checked,
      salaryIsRange: salaryMode === 'range',
      currency: currencyPicker.getValue(),
      workMode: mode.workMode,
      hybridOfficeDays: mode.hybridOfficeDays,
      contact: contactNameValue,
      contactLink: contactData.link,
      contactPlatform: contactData.platform,
      notes: valueOf('notes'),
      skipped: [],
      wentBack: false,
      history: [{ status: initialState, date: new Date().toISOString() }],
    };

    jobsStore.update(jobs => [newJob, ...jobs]);

    form.reset();
    datePicker?.setValue(todayISO());   // ← reset to TODAY, not ''
    workModePicker.setValue('');
    currencyPicker.setValue('usd');
    salaryModeChip.setValue('range');
    salaryInput.reset();
    contactLinkPicker.reset();
    renderInitialStatuses();
    refreshRoleOptionalHint();

    expandJobs();
    showToast(t('toast.jobAdded'), 'icon-check');
  });

  // ----------------------------------------------------------
  // Filter clicks
  // ----------------------------------------------------------
  document.getElementById('filters').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;

    currentFilter = btn.dataset.filter;
    document.querySelectorAll('#filters button').forEach(b =>
      b.classList.toggle('active', b === btn)
    );
    renderList();
  });

  // ----------------------------------------------------------
  // #list delegation
  // ----------------------------------------------------------
  const list = document.getElementById('list');

  list.addEventListener('click', (e) => {
    const card = e.target.closest('.job');
    if (!card) return;

    const id = Number(card.dataset.id);
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    const status = actionEl.dataset.status;

    switch (action) {
      case 'edit':              modals.onOpenEdit(id); break;
      case 'delete':            confirmDelete(id);     break;
      case 'history':           modals.onOpenHistory(id); break;
      case 'move-next':         modals.onAdvance(id, { direction: 'next' }); break;
      case 'move-prev':         modals.onAdvance(id, { direction: 'prev' }); break;
      case 'skip-step':         modals.onAdvance(id, { direction: 'next', skipCurrent: true }); break;
      case 'close':             if (status) modals.onClose(id, status); break;
      case 'close-offer':       modals.onClose(id, 'Offer'); break;
      case 'unconfirm-offer':   unconfirmOffer(id); break;
      case 'reopen':            reopenJob(id); break;
      case 'scroll-to-ref':     scrollToRef(Number(actionEl.dataset.refId)); break;
    }
  });

  async function confirmDelete(id) {
    const confirmed = await showConfirm({
      title: t('confirm.deleteJob.title'),
      message: t('confirm.deleteJob.message'),
      confirmText: t('confirm.deleteJob.confirm'),
      danger: true,
    });
    if (!confirmed) return;

    withUndo(
      [jobsStore, refsStore],
      t('toast.jobDeleted'),
      () => {
        jobsStore.update(jobs => jobs.filter(j => j.id !== id));
        refsStore.update(refs => refs.map(r => {
          if (r.linkedJobId !== id) return r;
          return { ...r, linkedJobId: null };
        }));
      },
      'icon-trash'
    );
  }

  function reopenJob(id) {
    updateById(jobsStore, id, j => withHistoryEntry(
      j,
      { status: 'Applied', offerConfirmed: false },
      { status: 'Applied' }
    ));
    showToast(t('toast.jobReopened'), 'icon-rotate-cw');
  }

  function unconfirmOffer(id) {
    updateById(jobsStore, id, j => ({ ...j, offerConfirmed: false }));
    showToast(t('toast.offerUnconfirmed'), 'icon-rotate-ccw');
  }

  // ----------------------------------------------------------
  // Drag & drop reordering
  // ----------------------------------------------------------
  list.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.job');
    if (!card) return;
    if (e.target.closest('button, a, input, textarea, select')) {
      e.preventDefault();
      return;
    }
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.id);
  });

  list.addEventListener('dragend', (e) => {
    const card = e.target.closest('.job');
    if (card) card.classList.remove('dragging');
    list.querySelectorAll('.job').forEach(c => c.classList.remove('drag-over'));
  });

  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    const dragging = list.querySelector('.job.dragging');
    if (!dragging) return;

    const after = getDragAfterElement(list, e.clientY);
    list.querySelectorAll('.job').forEach(c => c.classList.remove('drag-over'));

    if (after == null) list.appendChild(dragging);
    else {
      after.classList.add('drag-over');
      list.insertBefore(dragging, after);
    }
  });

  list.addEventListener('dragleave', (e) => {
    const card = e.target.closest('.job');
    if (card) card.classList.remove('drag-over');
  });

  list.addEventListener('drop', (e) => {
    e.preventDefault();
    const dragging = list.querySelector('.job.dragging');
    if (!dragging) return;

    const newOrder = [...list.querySelectorAll('.job')].map(c => Number(c.dataset.id));

    jobsStore.update(jobs => {
      const ordered = [...jobs].sort((a, b) => {
        const ia = newOrder.indexOf(a.id);
        const ib = newOrder.indexOf(b.id);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
      return ordered;
    });

    showToast(t('toast.orderUpdated'), 'icon-grip-vertical');
  });

  // ----------------------------------------------------------
  // scroll-to-job
  // ----------------------------------------------------------
  // Fired by other modules (e.g. refsController's "Go to job").
  // Expands the list, resets the filter if needed, and highlights
  // the target card.
  onScrollToJob((e) => {
    expandJobs();

    const { jobId } = e.detail;

    // Reset the filter to "all" so the target is visible.
    const btn = document.querySelector('#filters button[data-filter="all"]');
    if (btn && !btn.classList.contains('active')) btn.click();

    const target = list.querySelector(`.job[data-id="${jobId}"]`);
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
    renderFilters();
    renderInitialStatuses();
    statusCombo.refresh();
    salaryInput.refresh();
    contactLinkPicker.refresh();
    refreshRoleOptionalHint();
    renderJobsDash();
    renderList();
  });

  // ----------------------------------------------------------
  // Role combo
  // ----------------------------------------------------------
  const roleCombo = new RoleCombo(
    document.getElementById('roleCombo'),
    {
      getJobRoles: () => jobsStore.get().map(j => j.role),
      getConfig: () => configStore.get(),
      onCreateRequested: (suggested) => createRoleCtrl.requestNewRole(suggested),
    }
  );

  return { renderList, getFilter: () => currentFilter, roleCombo };
}

function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll('.job:not(.dragging)')];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}