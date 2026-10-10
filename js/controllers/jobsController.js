// ============================================================
// Controller: jobs
// ============================================================

import { showToast } from '../ui/toast.js';
import { showConfirm } from '../ui/confirmModal.js';
import { PuestoCombo } from '../ui/combo.js';
import { EstadoCombo } from '../ui/estadoCombo.js';
import { ModalidadPicker } from '../ui/modalidad.js';
import { CurrencyPicker } from '../ui/currencyPicker.js';
import { SalaryModeChip, DEFAULT_SALARY_MODE } from '../ui/salaryModeChip.js';
import { SalaryInput } from '../ui/salaryInput.js';
import { renderDashboard, buildWeeklyTrend } from '../ui/dashboard.js';
import {
  computeStats, filterJobs, sortJobs, isClosed,
} from '../selectors.js';
import { WORKFLOW_STEPS, CONFIG_FILTER_META } from '../constants.js';
import { renderStats } from '../templates/stats.js';
import { renderJobCard } from '../templates/jobCard.js';
import {
  uid, cloneArray, escapeHtml,
} from '../utils.js';
import { t, tState, tStateShort } from '../i18n.js';

/**
 * @param {import('../store.js').Store} jobsStore
 * @param {import('../store.js').Store} refsStore
 * @param {{ onOpenEdit, onClose, onAdvance, onOpenHistory }} modals
 * @param {import('../ui/datePicker.js').DatePicker} fechaPicker
 * @param {import('../store.js').Store} configStore
 * @param {{ requestNewPuesto: (suggested:string)=>Promise<string|null> }} createPuestoCtrl
 */
export function mountJobsController(jobsStore, refsStore, modals, fechaPicker, configStore, createPuestoCtrl) {
  let currentFilter = 'all';
  let searchTerm = '';
  const datePicker = fechaPicker;

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
  // EstadoCombo
  // ----------------------------------------------------------
  const estadoCombo = new EstadoCombo(
    document.getElementById('estadoCombo'),
    {
      getStates: () => {
        const cfg = configStore.get();
        return cfg.estadosIniciales && cfg.estadosIniciales.length
          ? cfg.estadosIniciales
          : WORKFLOW_STEPS.map(s => s.id);
      },
      getDefault: () => configStore.get().estadoInicialDefault || 'Aplicado',
      onChange: () => refreshPuestoOptionalHint(),
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
    const style = cfg.dashboardStyle || 'sparklines';

    const stats = computeStats(jobs);
    const ofertas = stats.ofertas;
    const activas = stats.activos;
    const cerradas = stats.cerradas;
    const enProceso = stats.enProceso;
    const total = stats.total;
    const tasaExito = total ? Math.round((ofertas / total) * 100) : 0;

    const empresaCount = {};
    jobs.forEach(j => {
      if (!j.empresa) return;
      empresaCount[j.empresa] = (empresaCount[j.empresa] || 0) + 1;
    });
    const top = Object.entries(empresaCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const getDate = j => j.fecha || j.createdAt || '';
    const trendTotal = buildWeeklyTrend(jobs, getDate);
    const trendActive = buildWeeklyTrend(jobs.filter(j => !isClosed(j.estado)), getDate);
    const trendHighlight = buildWeeklyTrend(jobs.filter(j => j.estado === 'Oferta'), getDate);
    const trendClosed = buildWeeklyTrend(jobs.filter(j => isClosed(j.estado)), getDate);

    renderDashboard(container, {
      style,
      total,
      active: activas,
      inProcess: enProceso,
      closed: cerradas,
      highlight: ofertas,
      highlightIcon: '🏆',
      highlightLabel: t('dash.jobs.highlight'),
      highlightSub: t('dash.jobs.highlightSub', { pct: tasaExito }),
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
      topLabel: t('dash.jobs.top'),
      topIcon: '🏢',
      top,
      summary: t('dash.jobs.summary', {
        total,
        active: activas,
        highlight: ofertas,
        plural: ofertas === 1 ? '' : 's',
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

    document.getElementById('stats').innerHTML =
      renderStats(computeStats(jobs));

    document.getElementById('jobCounter').textContent = jobs.length;

    renderJobsDash();

    const filtered = sortJobs(filterJobs(jobs, currentFilter, searchTerm));
    const list = document.getElementById('list');

    if (filtered.length === 0) {
      const noJobsAtAll = jobs.length === 0;
      list.innerHTML = `
        <div class="empty">
          <div class="empty-icon">📭</div>
          <h3>${escapeHtml(noJobsAtAll ? t('empty.jobs.title') : t('empty.jobs.filter.title'))}</h3>
          <p>${escapeHtml(noJobsAtAll ? t('empty.jobs.subtitle') : t('empty.jobs.filter.subtitle'))}</p>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered
      .map((job, i) => renderJobCard(job, { referidos: refs, index: i }))
      .join('');
  }

  jobsStore.subscribe(renderList);
  refsStore.subscribe(renderList);

  // ----------------------------------------------------------
  // Dynamic filters
  // ----------------------------------------------------------
  function getFilterLabel(id) {
    const meta = CONFIG_FILTER_META[id];
    if (meta) return { label: t('filter.' + id), icon: meta.icon };
    const step = WORKFLOW_STEPS.find(s => s.id === id);
    if (step) return { label: tStateShort(id), icon: step.icon };
    return { label: id, icon: '•' };
  }

  function renderFilters() {
    const cfg = configStore.get();
    const filters = (cfg.filtros || []).filter(f => f.visible);
    const container = document.getElementById('filters');

    if (!filters.some(f => f.id === currentFilter)) {
      currentFilter = 'all';
    }

    container.innerHTML = filters.map(f => {
      const { label, icon } = getFilterLabel(f.id);
      const active = f.id === currentFilter ? 'active' : '';
      return `<button data-filter="${escapeHtml(f.id)}" class="${active}">${icon} ${escapeHtml(label)}</button>`;
    }).join('');
  }

  configStore.subscribe(renderFilters);

  // ----------------------------------------------------------
  // Dynamic initial state
  // ----------------------------------------------------------
  function renderInitialStates() {
    const def = configStore.get().estadoInicialDefault || 'Aplicado';
    estadoCombo.setValue(def, { silent: true });
  }

  configStore.subscribe(renderInitialStates);

  renderFilters();
  renderInitialStates();

  // ----------------------------------------------------------
  // Search
  // ----------------------------------------------------------
  const searchInput = document.getElementById('jobSearch');
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderList();
  });

  // ----------------------------------------------------------
  // Modalidad + Currency + SalaryModeChip + SalaryInput
  // ----------------------------------------------------------
  const modalidadPicker = new ModalidadPicker(
    document.getElementById('modalidadPicker'),
    {
      hybridWrap: document.getElementById('hybridDaysWrap'),
      hybridSelect: document.getElementById('hybridOfficeDays'),
    }
  );

  const currencyPicker = new CurrencyPicker(
    document.getElementById('salarioCurrencyChip'),
    { value: 'usd' }
  );

  const salarioLabelEl = document.querySelector('#jobForm .field [data-salary-label]');

  const salaryModeChip = new SalaryModeChip(
    document.getElementById('salarioModeChip'),
    {
      value: DEFAULT_SALARY_MODE,
      fieldLabelEl: salarioLabelEl,
    }
  );

  const salaryHourlyCheckbox = document.getElementById('salarioPorHora');

  const salaryInput = new SalaryInput(
    document.getElementById('salario'),
    document.getElementById('salarioHint'),
    {
      getMode: () => salaryModeChip.getValue(),
      getCurrency: () => currencyPicker.getValue(),
      getHourly: () => salaryHourlyCheckbox.checked,
    }
  );

  currencyPicker.onChange = () => salaryInput.refresh();
  salaryModeChip.onChange = () => salaryInput.refresh();
  salaryHourlyCheckbox.addEventListener('change', () => salaryInput.refresh());

  // ----------------------------------------------------------
  // Form
  // ----------------------------------------------------------
  const form = document.getElementById('jobForm');

  const puestoLabel = document.querySelector('label[for="puesto"]');
  const puestoInput = document.getElementById('puesto');
  const puestoOriginalLabel = puestoLabel ? puestoLabel.textContent : '';

  function refreshPuestoOptionalHint() {
    if (!puestoLabel) return;
    const isGuardado = estadoCombo.getValue() === 'Guardado';
    puestoLabel.dataset.optional = isGuardado ? 'true' : 'false';
    puestoLabel.textContent = isGuardado
      ? `${puestoOriginalLabel} (${t('form.puesto.optional')})`
      : puestoOriginalLabel;
  }

  refreshPuestoOptionalHint();

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const initialState = estadoCombo.getValue();
    const puestoValue = valueOf('puesto');

    if (!puestoValue && initialState !== 'Guardado') {
      showToast(t('toast.puestoRequired'), '!');
      if (puestoInput) puestoInput.focus();
      return;
    }

    const modal = modalidadPicker.getValue();
    const salarioMode = salaryModeChip.getValue();

    const newJob = {
      id: uid(),
      empresa: valueOf('empresa'),
      puesto: puestoValue,
      fecha: datePicker?.getValue() || '',
      estado: initialState,
      link: valueOf('link'),
      salario: salaryInput.getValue(),
      salarioPorHora: salaryHourlyCheckbox.checked,
      salarioEsRango: salarioMode === 'range',
      moneda: currencyPicker.getValue(),
      modalidad: modal.modalidad,
      hybridOfficeDays: modal.hybridOfficeDays,
      contacto: valueOf('contacto'),
      notas: valueOf('notas'),
      skipped: [],
      volvioAtras: false,
      history: [{ estado: initialState, fecha: new Date().toISOString() }],
    };

    jobsStore.update(jobs => [newJob, ...jobs]);

    form.reset();
    datePicker?.setValue('');
    modalidadPicker.setValue('');
    currencyPicker.setValue('usd');
    salaryModeChip.setValue('range');
    salaryInput.reset();
    renderInitialStates();
    refreshPuestoOptionalHint();

    expandJobs();
    showToast(t('toast.jobAdded'), '✓');
  });

  // ----------------------------------------------------------
  // Filters: click
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
    const estado = actionEl.dataset.estado;

    switch (action) {
      case 'edit':              modals.onOpenEdit(id); break;
      case 'delete':            confirmDelete(id);     break;
      case 'history':           modals.onOpenHistory(id); break;
      case 'move-next':         modals.onAdvance(id, { direction: 'next' }); break;
      case 'move-prev':         modals.onAdvance(id, { direction: 'prev' }); break;
      case 'skip-step':         modals.onAdvance(id, { direction: 'next', skipCurrent: true }); break;
      case 'close':             if (estado) modals.onClose(id, estado); break;
      case 'close-offer':       modals.onClose(id, 'Oferta'); break;
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
    jobsStore.update(jobs => jobs.filter(j => j.id !== id));

    refsStore.update(refs => refs.map(r => {
      if (r.linkedJobId !== id) return r;
      return { ...r, linkedJobId: null };
    }));

    showToast(t('toast.jobDeleted'), '🗑️');
  }

  function reopenJob(id) {
    jobsStore.update(jobs => jobs.map(j => {
      if (j.id !== id) return j;
      const history = cloneArray(j.history);
      history.push({ estado: 'Aplicado', fecha: new Date().toISOString() });
      return { ...j, estado: 'Aplicado', history, offerConfirmed: false };
    }));
    showToast(t('toast.jobReopened'), '↻');
  }

  function unconfirmOffer(id) {
    jobsStore.update(jobs => jobs.map(j => {
      if (j.id !== id) return j;
      return { ...j, offerConfirmed: false };
    }));
    showToast(t('toast.offerUnconfirmed'), '↺');
  }

  function scrollToRef(refId) {
    document.dispatchEvent(new CustomEvent('scroll-to-ref', { detail: { refId } }));
  }

  // ----------------------------------------------------------
  // Drag & drop
  // ----------------------------------------------------------
  let draggedId = null;

  list.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.job');
    if (!card) return;
    if (e.target.closest('button, a, input, textarea, select')) {
      e.preventDefault();
      return;
    }
    draggedId = Number(card.dataset.id);
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(draggedId));
  });

  list.addEventListener('dragend', (e) => {
    const card = e.target.closest('.job');
    if (card) card.classList.remove('dragging');
    list.querySelectorAll('.job').forEach(c => c.classList.remove('drag-over'));
    draggedId = null;
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

    showToast(t('toast.orderUpdated'), '⠿');
  });

  // ----------------------------------------------------------
  // scroll-to-job
  // ----------------------------------------------------------
  document.addEventListener('scroll-to-job', () => {
    expandJobs();
  });

  // ----------------------------------------------------------
  // i18n
  // ----------------------------------------------------------
  document.addEventListener('i18n-changed', () => {
    renderFilters();
    renderInitialStates();
    estadoCombo.refresh();
    salaryInput.refresh();
    refreshPuestoOptionalHint();
    renderJobsDash();
    renderList();
  });

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------
  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  // ----------------------------------------------------------
  // Puesto combo
  // ----------------------------------------------------------
  const puestoCombo = new PuestoCombo(
    document.getElementById('puestoCombo'),
    {
      getJobPuestos: () => jobsStore.get().map(j => j.puesto),
      getConfig: () => configStore.get(),
      onCreateRequested: (suggested) => createPuestoCtrl.requestNewPuesto(suggested),
    }
  );

  return { renderList, getFilter: () => currentFilter, puestoCombo };
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