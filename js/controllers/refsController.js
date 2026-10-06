// ============================================================
// Controller: referrals
// - create form
// - filters + search
// - section toggle
// - event delegation on #refList
// - listens for 'scroll-to-ref' from jobsController
// ============================================================

import { showToast } from '../ui/toast.js';
import { showConfirm } from '../ui/confirmModal.js';
import { filterRefs, refStepIndex, isRefClosed } from '../selectors.js';
import { REF_WORKFLOW_STEPS } from '../constants.js';
import { renderRefCard } from '../templates/refCard.js';
import { uid, highlightAndScroll } from '../utils.js';
import { renderEmpresasChips, mountEmpresasChips } from '../ui/empresasChips.js';

/**
 * @param {import('../store.js').Store} jobsStore
 * @param {import('../store.js').Store} refsStore
 * @param {{
 *   onOpenRefEdit: (id:number)=>void,
 *   onRefToJob:    (refId:number)=>void,
 * }} modals
 */
export function mountRefsController(jobsStore, refsStore, modals) {
  // ----------------------------------------------------------
  // Local UI state
  // ----------------------------------------------------------
  let currentFilter = 'all';
  let searchTerm = '';
  let selectedRelacion = '';
  let selectedEstado = 'Pendiente';
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
  jobsStore.subscribe(renderRefs); // linked companies come from jobs

  // ----------------------------------------------------------
  // Chips
  // ----------------------------------------------------------
  // Mounted in main.js; injected here so this controller stays decoupled from ui/chips.js.
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

    const nuevo = {
      id: uid(),
      nombre,
      rol: valueOf('refRol'),
      contacto: valueOf('refContacto'),
      link: valueOf('refLink'),
      relacion: relacionChips?.getValue() || 'Conocido',
      estado: estadoChips?.getValue() || 'Pendiente',
      empresasVinculadas: [...selectedEmpresas],
      notas: valueOf('refNotas'),
      createdAt: new Date().toISOString(),
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
      case 'edit-ref':        modals.onOpenRefEdit(id); break;
      case 'delete-ref':      confirmDelete(id);        break;
      case 'move-ref-next':   moveRef(id, 'next');      break;
      case 'move-ref-prev':   moveRef(id, 'prev');      break;
      case 'close-ref':       closeRef(id);             break;
      case 'reopen-ref':      reopenRef(id);            break;
      case 'scroll-to-job':   scrollToJob(Number(actionEl.dataset.jobId)); break;
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

  function moveRef(id, direction) {
    const refs = refsStore.get();
    const r = refs.find(x => x.id === id);
    if (!r || isRefClosed(r.estado)) return;

    const idx = refStepIndex(r.estado);
    if (idx < 0) return;

    const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= REF_WORKFLOW_STEPS.length) return;

    const prevEstado = r.estado;
    const nuevoEstado = REF_WORKFLOW_STEPS[nextIdx].id;

    refsStore.update(refs => refs.map(x =>
      x.id === id ? { ...x, estado: nuevoEstado } : x
    ));

    showToast(`${r.nombre}: ${nuevoEstado}`, direction === 'next' ? '→' : '←');

    if (nuevoEstado === 'Referido hecho'
        && prevEstado !== 'Referido hecho'
        && direction === 'next') {
      setTimeout(() => modals.onRefToJob(id), 400);
    }
  }

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
    refsStore.update(refs => refs.map(x =>
      x.id === id ? { ...x, estado: 'No aplica' } : x
    ));
    showToast(`${r.nombre}: No aplica`, '🚫');
  }

  function reopenRef(id) {
    refsStore.update(refs => refs.map(x =>
      x.id === id ? { ...x, estado: 'Pendiente' } : x
    ));
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