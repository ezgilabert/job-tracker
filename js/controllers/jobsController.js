// ============================================================
// Controller: jobs
// - create form
// - filters
// - event delegation on #list (edit, delete, workflow, drag)
// ============================================================

import { showToast } from '../ui/toast.js';
import { showConfirm } from '../ui/confirmModal.js';
import {
  computeStats, filterJobs, sortJobs,
  isClosed, stepIndex, progressPct,
} from '../selectors.js';
import { WORKFLOW_STEPS, CLOSED_STATES } from '../constants.js';
import { renderStats } from '../templates/stats.js';
import { renderJobCard } from '../templates/jobCard.js';
import { uid, todayISO, cloneArray, bindHourlySalaryPlaceholder } from '../utils.js';

/**
 * @param {import('../store.js').Store} jobsStore
 * @param {import('../store.js').Store} refsStore
 * @param {{ onOpenEdit: (id:number)=>void, onClose: (id:number, estado:string)=>void, onAdvance: (id:number, opts:object)=>void }} modals
 * @param {import('../ui/datePicker.js').DatePicker} fechaPicker
 */
export function mountJobsController(jobsStore, refsStore, modals, fechaPicker) {
  // ----------------------------------------------------------
  // Local UI state
  // ----------------------------------------------------------
  let currentFilter = 'all';

  // ----------------------------------------------------------
  // UI components
  // ----------------------------------------------------------
  const datePicker = fechaPicker;

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  function renderList() {
    const jobs = jobsStore.get();
    const refs = refsStore.get();

    document.getElementById('stats').innerHTML =
      renderStats(computeStats(jobs));

    const filtered = sortJobs(filterJobs(jobs, currentFilter));
    const list = document.getElementById('list');

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty">
          <div class="empty-icon">📭</div>
          <h3>${jobs.length === 0 ? 'Todavía no cargaste postulaciones' : 'Sin resultados en este filtro'}</h3>
          <p>${jobs.length === 0 ? 'Empezá agregando una arriba ☝️' : 'Probá con otro filtro'}</p>
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
  // Create form
  // ----------------------------------------------------------
  const form = document.getElementById('jobForm');
  const salaryHourlyCheckbox = document.getElementById('salarioPorHora');
  const updateSalaryPlaceholder = bindHourlySalaryPlaceholder(
    document.getElementById('salario'),
    salaryHourlyCheckbox
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nuevo = {
      id: uid(),
      empresa: valueOf('empresa'),
      puesto: valueOf('puesto'),
      fecha: datePicker?.getValue() || '',
      estado: document.getElementById('estado').value,
      link: valueOf('link'),
      salario: valueOf('salario'),
      salarioPorHora: document.getElementById('salarioPorHora').checked,
      contacto: valueOf('contacto'),
      notas: valueOf('notas'),
      skipped: [],
      history: [{ estado: document.getElementById('estado').value, fecha: new Date().toISOString() }],
    };

    jobsStore.update(jobs => [nuevo, ...jobs]);

    form.reset();
    updateSalaryPlaceholder();
    datePicker?.setValue('');
    showToast('Postulación agregada', '✓');
  });

  // ----------------------------------------------------------
  // Filters
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
      case 'edit':         modals.onOpenEdit(id); break;
      case 'delete':       confirmDelete(id);     break;
      case 'move-next':    modals.onAdvance(id, { direction: 'next' }); break;
      case 'move-prev':    modals.onAdvance(id, { direction: 'prev' }); break;
      case 'skip-step':    modals.onAdvance(id, { direction: 'next', skipCurrent: true }); break;
      case 'close':        if (estado) modals.onClose(id, estado); break;
      case 'close-offer':  modals.onClose(id, 'Oferta'); break;
      case 'reopen':       reopenJob(id); break;
      case 'scroll-to-ref': scrollToRef(Number(actionEl.dataset.refId)); break;
    }
  });

  async function confirmDelete(id) {
    const confirmed = await showConfirm({
      title: '¿Borrar postulación?',
      message: 'Esta acción no se puede deshacer.',
      confirmText: 'Borrar',
      danger: true,
    });
    if (!confirmed) return;
    jobsStore.update(jobs => jobs.filter(j => j.id !== id));
    showToast('Postulación borrada', '🗑️');
  }

  function reopenJob(id) {
    jobsStore.update(jobs => jobs.map(j => {
      if (j.id !== id) return j;
      const history = cloneArray(j.history);
      history.push({ estado: 'Aplicado', fecha: new Date().toISOString() });
      return { ...j, estado: 'Aplicado', history };
    }));
    showToast('Postulación reabierta', '↻');
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

    showToast('Orden actualizado', '⠿');
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