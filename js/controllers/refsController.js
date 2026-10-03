// ============================================================
// Controller: referidos
// - form de alta
// - filtros + búsqueda
// - toggle de sección
// - event delegation sobre #refList
// - escucha 'scroll-to-ref' disparado desde jobsController
// ============================================================

import { showToast } from '../ui/toast.js';
import { filterRefs, refStepIndex, isRefClosed } from '../selectors.js';
import { REF_WORKFLOW_STEPS } from '../constants.js';
import { renderRefCard } from '../templates/refCard.js';
import { uid, highlightAndScroll } from '../utils.js';

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
  // Estado local del controller
  // ----------------------------------------------------------
  let currentFilter = 'all';
  let searchTerm = '';
  let selectedRelacion = '';
  let selectedEstado = 'Pendiente';
  let selectedEmpresas = new Set();

  // Chips (los maneja ui/chips.js)
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
  jobsStore.subscribe(renderRefs); // porque las empresas vinculadas dependen de jobs

  // ----------------------------------------------------------
  // Chips iniciales
  // ----------------------------------------------------------
  // Se inicializan en main.js después de importar ui/chips.js.
  // Los exponemos con un setter para no acoplar el controller al módulo de chips.
  function initChips(relacion, estado) {
    relacionChips = relacion;
    estadoChips = estado;
    relacionChips.setValue(null);
    estadoChips.setValue('Pendiente');
  }

  // ----------------------------------------------------------
  // Form de alta
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
      linkedin: valueOf('refLinkedin'),
      relacion: relacionChips?.getValue() || 'Conocido',
      estado: estadoChips?.getValue() || 'Pendiente',
      empresasVinculadas: [...selectedEmpresas],
      notas: valueOf('refNotas'),
      createdAt: new Date().toISOString(),
    };

    refsStore.update(refs => [nuevo, ...refs]);

    // Reset
    refForm.reset();
    relacionChips?.setValue(null);
    estadoChips?.setValue('Pendiente');
    selectedEmpresas = new Set();
    renderEmpresasChips(
      document.getElementById('refEmpresasWrap'),
      selectedEmpresas
    );

    showToast('Referido agregado', '✓');
  });

  // ----------------------------------------------------------
  // Empresas vinculadas (chips reutilizables)
  // ----------------------------------------------------------
  function renderEmpresasChips(container, selectedSet) {
    const empresas = [...new Set(jobsStore.get().map(j => j.empresa).filter(Boolean))];

    if (empresas.length === 0) {
      container.innerHTML = `<span class="ref-empresa-empty">Agregá postulaciones primero para poder vincularlas</span>`;
      return;
    }

    container.innerHTML = empresas.map(emp => {
      const sel = selectedSet.has(emp);
      return `<button type="button" class="ref-empresa-chip ${sel ? 'selected' : ''}" data-empresa="${escapeAttr(emp)}">${escapeAttr(emp)}</button>`;
    }).join('');
  }

  // Delegación sobre el wrap de empresas (una sola vez)
  document.getElementById('refEmpresasWrap').addEventListener('click', (e) => {
    const chip = e.target.closest('.ref-empresa-chip');
    if (!chip) return;
    const emp = chip.dataset.empresa;
    if (selectedEmpresas.has(emp)) {
      selectedEmpresas.delete(emp);
      chip.classList.remove('selected');
    } else {
      selectedEmpresas.add(emp);
      chip.classList.add('selected');
    }
  });

  // Re-pintar chips de empresas cada vez que cambian los jobs
  jobsStore.subscribe(() => {
    renderEmpresasChips(
      document.getElementById('refEmpresasWrap'),
      selectedEmpresas
    );
  });

  // Primer render
  renderEmpresasChips(
    document.getElementById('refEmpresasWrap'),
    selectedEmpresas
  );

  // ----------------------------------------------------------
  // Búsqueda y filtros
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
  // Toggle de sección
  // ----------------------------------------------------------
  const refToggleBtn = document.getElementById('refToggleBtn');
  const referidosBody = document.getElementById('referidosBody');
  refToggleBtn.style.transition = 'transform 0.3s ease';

  refToggleBtn.addEventListener('click', () => {
    const collapsed = referidosBody.classList.toggle('collapsed');
    refToggleBtn.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0)';
  });

  // ----------------------------------------------------------
  // Delegación sobre #refList
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

  function confirmDelete(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    if (!confirm(`¿Borrar a ${r.nombre} de referidos?`)) return;
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

    // Si acaba de llegar a "Referido hecho" → ofrecer mover a postulaciones
    if (nuevoEstado === 'Referido hecho'
        && prevEstado !== 'Referido hecho'
        && direction === 'next') {
      setTimeout(() => modals.onRefToJob(id), 400);
    }
  }

  function closeRef(id) {
    const r = refsStore.get().find(x => x.id === id);
    if (!r) return;
    if (!confirm(`¿Marcar a ${r.nombre} como "No aplica"?`)) return;
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
  // Escucha scroll-to-ref disparado desde jobsController
  // ----------------------------------------------------------
  document.addEventListener('scroll-to-ref', (e) => {
    const { refId } = e.detail;

    // Expandir la sección si está colapsada
    if (referidosBody.classList.contains('collapsed')) {
      referidosBody.classList.remove('collapsed');
      refToggleBtn.style.transform = 'rotate(0)';
    }

    // Resetear filtros si el referido no está visible
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

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  return { renderRefs, initChips };
}