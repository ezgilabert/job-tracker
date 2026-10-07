// ============================================================
// Controller: jobs
// ============================================================

import { showToast } from '../ui/toast.js';
import { showConfirm } from '../ui/confirmModal.js';
import {
  computeStats, filterJobs, sortJobs,
} from '../selectors.js';
import { WORKFLOW_STEPS, CONFIG_FILTER_META } from '../constants.js';
import { renderStats } from '../templates/stats.js';
import { renderJobCard } from '../templates/jobCard.js';
import {
  uid, cloneArray, bindHourlySalaryPlaceholder, escapeHtml,
} from '../utils.js';
import { t, tState, tStateShort } from '../i18n.js';

/**
 * @param {import('../store.js').Store} jobsStore
 * @param {import('../store.js').Store} refsStore
 * @param {{ onOpenEdit, onClose, onAdvance, onOpenHistory }} modals
 * @param {import('../ui/datePicker.js').DatePicker} fechaPicker
 * @param {import('../store.js').Store} configStore
 */
export function mountJobsController(jobsStore, refsStore, modals, fechaPicker, configStore) {
  let currentFilter = 'all';
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
  // Main render
  // ----------------------------------------------------------
  function renderList() {
    const jobs = jobsStore.get();
    const refs = refsStore.get();

    document.getElementById('stats').innerHTML =
      renderStats(computeStats(jobs));

    document.getElementById('jobCounter').textContent = jobs.length;

    const filtered = sortJobs(filterJobs(jobs, currentFilter));
    const list = document.getElementById('list');

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty">
          <div class="empty-icon">📭</div>
          <h3>${escapeHtml(jobs.length === 0 ? t('empty.jobs.title') : t('empty.jobs.filter.title'))}</h3>
          <p>${escapeHtml(jobs.length === 0 ? t('empty.jobs.subtitle') : t('empty.jobs.filter.subtitle'))}</p>
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
    const cfg = configStore.get();
    const states = cfg.estadosIniciales && cfg.estadosIniciales.length
      ? cfg.estadosIniciales
      : WORKFLOW_STEPS.map(s => s.id);

    const defaultState = cfg.estadoInicialDefault || 'Aplicado';
    const select = document.getElementById('estado');

    select.innerHTML = states.map(id => {
      const step = WORKFLOW_STEPS.find(s => s.id === id);
      const icon = step ? step.icon : '•';
      const isSelected = id === defaultState ? 'selected' : '';
      return `<option value="${escapeHtml(id)}" ${isSelected}>${icon} ${escapeHtml(tState(id))}</option>`;
    }).join('');
  }

  configStore.subscribe(renderInitialStates);

  // Initial render
  renderFilters();
  renderInitialStates();

  // ----------------------------------------------------------
  // Form: create application
  // ----------------------------------------------------------
  const form = document.getElementById('jobForm');
  const salaryHourlyCheckbox = document.getElementById('salarioPorHora');
  const updateSalaryPlaceholder = bindHourlySalaryPlaceholder(
    document.getElementById('salario'),
    salaryHourlyCheckbox
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const initialState = document.getElementById('estado').value;

    const newJob = {
      id: uid(),
      empresa: valueOf('empresa'),
      puesto: valueOf('puesto'),
      fecha: datePicker?.getValue() || '',
      estado: initialState,
      link: valueOf('link'),
      salario: valueOf('salario'),
      salarioPorHora: document.getElementById('salarioPorHora').checked,
      contacto: valueOf('contacto'),
      notas: valueOf('notas'),
      skipped: [],
      volvioAtras: false,
      history: [{ estado: initialState, fecha: new Date().toISOString() }],
    };

    jobsStore.update(jobs => [newJob, ...jobs]);

    form.reset();
    updateSalaryPlaceholder();
    datePicker?.setValue('');
    renderInitialStates();

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

    // If a referral pointed to this application, clear the link so the
    // referral's "go back" button is no longer locked.
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

  // "Unmark" the confirmed offer: clear the flag so the user can edit
  // or continue the workflow again.
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
  // scroll-to-job: expand section if collapsed
  // ----------------------------------------------------------
  document.addEventListener('scroll-to-job', () => {
    expandJobs();
  });

  // ----------------------------------------------------------
  // i18n: re-render on language change
  // ----------------------------------------------------------
  document.addEventListener('i18n-changed', () => {
    renderFilters();
    renderInitialStates();
    renderList();
  });

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------
  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  return { renderList, getFilter: () => currentFilter };
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